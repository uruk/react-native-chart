/* @flow */
'use strict';
import React, { Component, PropTypes } from 'react';
import { LayoutAnimation, StyleSheet, View } from 'react-native';
import BarChart from './src/BarChart';
import LineChart from './src/LineChart';
import PieChart from './src/PieChart';
import YAxis from './src/yAxis';
import XAxis from './src/xAxis';
import * as C from './src/constants';

const styles = StyleSheet.create({
	default: { flex: 1 },
});

const getRoundNumber = (value, gridStep) => {
	if (value <= 0) return 0;
	const logValue = Math.log10(value);
	const scale = Math.pow(10, Math.floor(logValue));
	const n = Math.ceil(value / scale * 4);

	let tmp = n % gridStep;
	if (tmp !== 0) tmp += (gridStep - tmp);
	return n * scale / 4.0;
};


export default class Chart extends Component<void, any, any> {
	static defaultProps : any = {
		data: [],
		animationDuration: 0.5,
		axisColor: C.BLACK,
		axisLabelColor: C.BLACK,
		axisLineWidth: 1,
		axisTitleColor: C.GREY,
		axisTitleFontSize: 16,
		chartFontSize: 14,
		gridColor: C.BLACK,
		gridLineWidth: 0.5,
		labelFontSize: 10,
		hideHorizontalGridLines: false,
		hideVerticalGridLines: false,
		showAxis: true,
		showGrid: true,
		showXAxisLabels: true,
		showYAxisLabels: true,
		tightBounds: false,
		verticalGridStep: 3,
		yAxisWidth: 30,
		xAxisHeight: 20,
		horizontalScale: 1,
	};

	constructor(props : any) {
		super(props);
		this.state = { bounds: { min: 0, max: 0 } };
	}
	componentDidMount() {
		this._computeBounds();
	}
	componentWillUpdate() {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
	}

	componentDidUpdate(props : any) {
		if (this.props !== props) {
			this._computeBounds();
		}
	}

	_drawGrid(props : any) {
		if (!props.showGrid) return null;
		const range = [];
		const data = props.data || [];
		// TODO: This is wrong!
		const uniqueValuesInDataSet = data.filter((v, i, self) => self.indexOf(v) === i);
		const steps = (uniqueValuesInDataSet.length < props.verticalGridStep) ? uniqueValuesInDataSet.length : props.verticalGridStep;
		for (let i = steps; i > 0; i--) range.push(i);

		const containerStyle = { width: props.width, height: props.height, position: 'absolute', left: 0 };

		let intendedLineWidth = props.gridLineWidth;
		if (props.gridLineWidth < 1) {
			intendedLineWidth = StyleSheet.hairlineWidth;
		}

		const horizontalGridStyle = {
			height: props.height / props.verticalGridStep,
			width: props.width,
			borderTopColor: props.gridColor,
			borderTopWidth: intendedLineWidth,
		};
		const verticalGridStyle = {
			height: props.height,
			width: props.width / data.length,
			borderRightColor: props.gridColor,
			borderRightWidth: intendedLineWidth,
		};

		return (
			<View style={containerStyle}>
				{(() => {
					if (props.hideHorizontalGridLines) return null;
					// Grid lines going top to bottom
					return (
						<View style={{ position: 'absolute', flexDirection: 'column', justifyContent: 'space-around' }}>
							{range.map((_, i) => <View key={i} style={horizontalGridStyle} />)}
						</View>
					);
				})()}
				{(() => {
					if (props.hideVerticalGridLines) return null;
					// Grid lines going left to right
					return (
						<View style={{ flexDirection: 'row', position: 'absolute', justifyContent: 'space-around' }}>
							{data.map((_, i) => <View key={i} style={verticalGridStyle} />)}
						</View>
					);
				})()}
			</View>
		);
	}

	_computeBounds() : any {
		let min = Infinity;
		let max = -Infinity;
		const data = this.props.data || [];
		data.forEach(XYPair => {
			const number = XYPair[1];
			if (number < min) min = number;
			if (number > max) max = number;
		});

		min = Math.round(min);
		max = Math.round(max);

		// Exit if we want tight bounds
		if (this.props.tightBounds) {
			return this.setState({ bounds: { min, max } });
		}

		max = getRoundNumber(max, this.props.verticalGridStep);
		if (min < 0) {
			let step;

			if (this.props.verticalGridStep > 3) {
				step = Math.abs(max - min) / (this.props.verticalGridStep - 1);
			} else {
				step = Math.max(Math.abs(max - min) / 2, Math.max(Math.abs(min), Math.abs(max)));
			}
			step = getRoundNumber(step, this.props.verticalGridStep);
			let newMin;
			let newMax;

			if (Math.abs(min) > Math.abs(max)) {
				const m = Math.ceil(Math.abs(min) / step);
				newMin = step * m * (min > 0 ? 1 : -1);
				newMax = step * (this.props.verticalGridStep - m) * (max > 0 ? 1 : -1);
			} else {
				const m = Math.ceil(Math.abs(max) / step);
				newMax = step * m * (max > 0 ? 1 : -1);
				newMin = step * (this.props.verticalGridStep - m) * (min > 0 ? 1 : -1);
			}
			if (min < newMin) {
				newMin -= step;
				newMax -= step;
			}
			if (max > newMax + step) {
				newMin += step;
				newMax += step;
			}
			if (max < min) {
				const tmp = max;
				max = min;
				min = tmp;
			}
		}
		this.setState({ bounds: { max, min } });
		return null;
	}

	_minVerticalBound() : number {
		if (this.props.tightBounds) return this.state.bounds.min;
		return (this.state.bounds.min > 0) ? this.state.bounds.min : 0;
	}

	_maxVerticalBound() : number {
		if (this.props.tightBounds) return this.state.bounds.max;
		return (this.state.bounds.max > 0) ? this.state.bounds.max : 0;
	}

	render() {
		const components = { 'line': LineChart, 'bar': BarChart, 'pie': PieChart };
		return (
			<View>
				{(() => {
					const Chart = components[this.props.type] || BarChart;
					if (this.props.showAxis && Chart !== PieChart) {
						return (
							<View
								ref="container"
								style={[this.props.style || {}, { flex: 1, flexDirection: 'column' }]}
								onLayout={(e) => this.setState({
									containerHeight: e.nativeEvent.layout.height,
									containerWidth: e.nativeEvent.layout.width,
								})}
							>
								<View style={[styles.default, { flexDirection: 'row' }]}>
									<View ref="yAxis">
										<YAxis
											{...this.props}
											data={this.props.data}
											height={this.state.containerHeight - this.props.xAxisHeight}
											width={this.props.yAxisWidth}
											minVerticalBound={this.state.bounds.min}
											containerWidth={this.state.containerWidth}
											maxVerticalBound={this.state.bounds.max}
											style={{ width: this.props.yAxisWidth }}
										/>
									</View>
									<Chart
										{...this.props}
										data={this.props.data}
										width={this.state.containerWidth - this.props.yAxisWidth}
										height={this.state.containerHeight - this.props.xAxisHeight}
										minVerticalBound={this.state.bounds.min}
										maxVerticalBound={this.state.bounds.max}
										drawGrid={this._drawGrid}
									/>
								</View>
								{(() => {
									return (
										<View ref="xAxis">
											<XAxis
												{...this.props}
												width={this.state.containerWidth - this.props.yAxisWidth}
												data={this.props.data}
												height={this.props.xAxisHeight}
												style={{ marginLeft: this.props.yAxisWidth - 1 }}
											/>
										</View>
									);
								})()}
							</View>
						);
					}
					return (
						<View
							ref="container"
							onLayout={(e) => this.setState({
								containerHeight: e.nativeEvent.layout.height,
								containerWidth: e.nativeEvent.layout.width,
							})}
							style={[this.props.style || {}, styles.default]}
						>
							<Chart
								{...this.props}
								width={this.state.containerWidth}
								height={this.state.containerHeight}
								data={this.props.data}
							/>
						</View>
					);
				})()}
			</View>
		);
	}
}

Chart.propTypes = {
	// Shared properties between most types
	data: PropTypes.arrayOf(PropTypes.array).isRequired,
	type: PropTypes.oneOf(['line', 'bar', 'pie']).isRequired,
	highlightColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // TODO
	highlightIndices: PropTypes.arrayOf(PropTypes.number), // TODO
	onDataPointPress: PropTypes.func,

	// Bar chart props
	color: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	cornerRadius: PropTypes.number,
	fillGradient: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])), // TODO
	widthPercent: PropTypes.number,

	// Line/multi-line chart props
	fillColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // TODO
	dataPointColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	dataPointFillColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	dataPointRadius: PropTypes.number,
	highlightRadius: PropTypes.number, // TODO
	lineWidth: PropTypes.number,
	showDataPoint: PropTypes.bool, // TODO

	// Pie chart props
	pieCenterRatio: PropTypes.number, // TODO
	sliceColors: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
	animationDuration: PropTypes.number, // TODO
	axisColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	axisLabelColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	axisLineWidth: PropTypes.number,
	axisTitleColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	axisTitleFontSize: PropTypes.number,
	chartFontSize: PropTypes.number,
	chartTitle: PropTypes.string,
	chartTitleColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	gridColor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	gridLineWidth: PropTypes.number,
	hideHorizontalGridLines: PropTypes.bool,
	hideVerticalGridLines: PropTypes.bool,
	labelFontSize: PropTypes.number,
	showAxis: PropTypes.bool,
	showGrid: PropTypes.bool,
	showXAxisLabels: PropTypes.bool,
	showYAxisLabels: PropTypes.bool,
	style: PropTypes.any,
	tightBounds: PropTypes.bool,
	verticalGridStep: PropTypes.number,
	xAxisTitle: PropTypes.string,
	xAxisHeight: PropTypes.number,
	yAxisTitle: PropTypes.string,
	yAxisTransform: PropTypes.func,
	yAxisWidth: PropTypes.number,
};
