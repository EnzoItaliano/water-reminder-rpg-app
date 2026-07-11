package com.enzod.waterreminderrpg

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.widget.Toast
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import org.json.JSONArray

class NotificationService : Service() {

    companion object {
        private const val DRINK_PREFS = "notification_drinks"
        private const val DRINK_KEY = "pending"

        // Called from the service (main thread) and NotificationModule (RN
        // native-modules thread) — @Synchronized guards the read-modify-write.
        @Synchronized
        fun queueDrink(context: Context, timestampMs: Long) {
            val prefs = context.getSharedPreferences(DRINK_PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(DRINK_KEY, "[]"))
            arr.put(timestampMs)
            prefs.edit().putString(DRINK_KEY, arr.toString()).apply()
        }

        @Synchronized
        fun consumeDrinks(context: Context): List<Long> {
            val prefs = context.getSharedPreferences(DRINK_PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(DRINK_KEY, "[]"))
            prefs.edit().remove(DRINK_KEY).apply()
            return (0 until arr.length()).map { arr.getLong(it) }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var drinkReminderRunnable: Runnable? = null
    private var expireRunnable: Runnable? = null
    private var isServiceRunning = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            when (intent.action) {
                "START_REMINDERS" -> {
                    val intervalInSeconds = intent.getIntExtra("INTERVAL", 60)
                    val endTimeMillis = intent.getLongExtra("END_TIME", 0L)
                    startReminders(intervalInSeconds, endTimeMillis)
                }
                "STOP_REMINDERS" -> {
                    stopReminders()
                    stopSelf()
                }
                "DRINK_WATER" -> {
                    handleDrinkAction()
                    // A tap on a stale notification can start the service
                    // fresh; don't leave it idling in that case.
                    if (!isServiceRunning) stopSelf()
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun openAppPendingIntent(): PendingIntent? {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
        return PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun drinkActionPendingIntent(): PendingIntent {
        val intent = Intent(this, NotificationService::class.java).setAction("DRINK_WATER")
        return PendingIntent.getService(
            this, 1, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun handleDrinkAction() {
        queueDrink(this, System.currentTimeMillis())

        // Wake the JS side immediately if the React context is alive;
        // otherwise the queued timestamp is consumed on next app launch/resume.
        try {
            (application as? ReactApplication)
                ?.reactHost
                ?.currentReactContext
                ?.emitDeviceEvent("onNotificationDrink", null)
        } catch (e: Exception) {
            // JS unavailable — the queue covers it.
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1)
        Toast.makeText(this, "Water logged! 💧", Toast.LENGTH_SHORT).show()
    }

    private fun startReminders(intervalInSeconds: Int, endTimeMillis: Long) {
        if (isServiceRunning) return
        isServiceRunning = true

        createNotificationChannel(this)

        // The foreground service needs an initial sticky notification
        val foregroundNotification: Notification = NotificationCompat.Builder(this, "fight_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Fight is Active!")
            .setContentText("Water reminders are running in the background.")
            .setPriority(NotificationCompat.PRIORITY_LOW) // Make it silent
            .setContentIntent(openAppPendingIntent())
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1001, foregroundNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1001, foregroundNotification)
        }

        expireRunnable = Runnable {
            sendFailedNotification()
            stopReminders()
            stopSelf()
        }

        val delayMillis = endTimeMillis - System.currentTimeMillis()
        if (delayMillis > 0) {
            handler.postDelayed(expireRunnable!!, delayMillis)
        } else {
            handler.post(expireRunnable!!)
        }

        drinkReminderRunnable = object : Runnable {
            override fun run() {
                val builder = NotificationCompat.Builder(this@NotificationService, "fight_channel")
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle("Drink Water!")
                    .setContentText("It's time to drink a cup of water to defeat the monster!")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(openAppPendingIntent())
                    .addAction(0, "Drink", drinkActionPendingIntent())

                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.notify(1, builder.build())

                handler.postDelayed(this, (intervalInSeconds * 1000).toLong())
            }
        }

        handler.postDelayed(drinkReminderRunnable!!, (intervalInSeconds * 1000).toLong())
    }

    private fun sendFailedNotification() {
        val builder = NotificationCompat.Builder(this, "fight_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Session Failed!")
            .setContentText("The monster escaped! You didn't drink enough water in time.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(openAppPendingIntent())

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(2, builder.build())
    }

    private fun stopReminders() {
        drinkReminderRunnable?.let { handler.removeCallbacks(it) }
        expireRunnable?.let { handler.removeCallbacks(it) }
        drinkReminderRunnable = null
        expireRunnable = null
        isServiceRunning = false
        // Drop any reminder still showing so its Drink button can't outlive the session
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            stopForeground(true)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        stopReminders()
        super.onDestroy()
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Fight Notifications"
            val descriptionText = "Notifications during fights"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel("fight_channel", name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
