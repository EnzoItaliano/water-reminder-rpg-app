package com.enzod.waterreminderrpg

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NotificationModule"
    }

    @ReactMethod
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val context = reactApplicationContext
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                reactApplicationContext.currentActivity?.let { activity ->
                    ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
                }
            }
        }
    }

    @ReactMethod
    fun startDrinkReminders(intervalInSeconds: Int) {
        val context = reactApplicationContext

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                // We still schedule it, but the OS might block until permission is granted
            }
        }
        
        val intent = Intent(context, NotificationService::class.java)
        intent.action = "START_REMINDERS"
        intent.putExtra("INTERVAL", intervalInSeconds)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @ReactMethod
    fun stopDrinkReminders() {
        val context = reactApplicationContext
        val intent = Intent(context, NotificationService::class.java)
        intent.action = "STOP_REMINDERS"
        context.startService(intent) // stopSelf handled inside service
    }

    @ReactMethod
    fun sendSessionFailedNotification() {
        val context = reactApplicationContext
        createNotificationChannel(context)

        val builder = NotificationCompat.Builder(context, "fight_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Session Failed!")
            .setContentText("The monster escaped! You didn't drink enough water in time.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // notify(2) for a separate ID
        notificationManager.notify(2, builder.build())
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Fight Notifications"
            val descriptionText = "Notifications during fights"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel("fight_channel", name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
