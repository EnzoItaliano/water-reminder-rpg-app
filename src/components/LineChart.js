import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { PixelText } from './PixelText';
import { computeChartGeometry } from '../utils/chartGeometry';

const PAD_TOP = 10;
const PAD_BOTTOM = 24;
const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const TICK_COUNT = 4;

export const LineChart = ({ points, width, height }) => {
    const g = computeChartGeometry(points, {
        width, height,
        padTop: PAD_TOP, padBottom: PAD_BOTTOM, padLeft: PAD_LEFT, padRight: PAD_RIGHT,
        tickCount: TICK_COUNT,
    });

    return (
        <View style={{ width, height }}>
            <Svg width={width} height={height}>
                {g.yTicks.map((tick, i) => (
                    <Line
                        key={`grid-${i}`}
                        x1={PAD_LEFT} y1={tick.y}
                        x2={width - PAD_RIGHT} y2={tick.y}
                        stroke="#444" strokeWidth={1}
                    />
                ))}
                <Polyline points={g.line} fill="none" stroke="#3498db" strokeWidth={2} />
                {g.dots.map((d, i) => (
                    <Circle key={`dot-${i}`} cx={d.x} cy={d.y} r={2.5} fill="#fff" />
                ))}
            </Svg>

            {g.yTicks.map((tick, i) => (
                <PixelText
                    key={`ylab-${i}`}
                    size={7}
                    color="#7f8c8d"
                    style={{ position: 'absolute', left: 0, top: tick.y - 4, width: PAD_LEFT - 4, textAlign: 'right' }}
                >
                    {tick.liters.toFixed(1)}
                </PixelText>
            ))}

            {g.xLabels.map((xl, i) => (
                <PixelText
                    key={`xlab-${i}`}
                    size={7}
                    color="#7f8c8d"
                    style={{ position: 'absolute', top: height - 14, left: xl.x - 10, width: 20, textAlign: 'center' }}
                >
                    {xl.label}
                </PixelText>
            ))}
        </View>
    );
};
