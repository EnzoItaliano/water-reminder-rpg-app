import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useGame } from '../context/GameContext';
import { PixelText } from '../components/PixelText';
import { SmallBtn } from '../components/Buttons';
import { LineChart } from '../components/LineChart';
import { buildSeries, hasData } from '../utils/history';
import { useTranslation } from 'react-i18next';

const PERIODS = ['week', 'month', 'year'];

export default function StatsScreen() {
    const { t } = useTranslation();
    const { stats } = useGame();
    const [period, setPeriod] = useState('week');

    const weekdayInitials = t('stats.weekdayInitials', { returnObjects: true });
    const monthInitials = t('stats.monthInitials', { returnObjects: true });

    const points = buildSeries(
        stats.dailyIntake || {},
        period,
        new Date(),
        {
            weekStartsOn: stats.weekStartsOn ?? 0,
            weekdayInitials,
            monthInitials,
        }
    );

    const chartWidth = Dimensions.get('window').width - 40;
    const chartHeight = 220;
    const showChart = points.length > 0 && hasData(points);

    return (
        <View style={styles.container}>
            <View style={styles.selector}>
                {PERIODS.map((p) => {
                    const active = period === p;
                    return (
                        <View key={p} style={{ flex: 1, marginHorizontal: 4 }}>
                            <SmallBtn
                                title={t(`stats.${p}`)}
                                onPress={() => setPeriod(p)}
                                color={active ? '#3498db' : '#555'}
                                borderColor={active ? '#2980b9' : '#000'}
                            />
                        </View>
                    );
                })}
            </View>

            <View style={styles.chartPanel}>
                {showChart ? (
                    <LineChart points={points} width={chartWidth} height={chartHeight} />
                ) : (
                    <View style={styles.emptyBox}>
                        <PixelText size={9} color="#7f8c8d" style={{ textAlign: 'center', lineHeight: 16 }}>
                            {t('stats.empty')}
                        </PixelText>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
        padding: 20,
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    chartPanel: {
        backgroundColor: '#2a2a2a',
        borderWidth: 2,
        borderColor: '#000',
        padding: 10,
    },
    emptyBox: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
