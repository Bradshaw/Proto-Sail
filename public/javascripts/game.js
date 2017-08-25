var width, height;

var targetFeedbackElement = document.getElementById('target-feedback');
var compassBackgroundElement = document.getElementById('compass-background');

function onWindowResize(event) {
	width = window.innerWidth;
	height = window.innerHeight;

	vignette.style.backgroundSize = width + 'px ' + height + 'px';
}

addEventListener('resize', onWindowResize, false);
onWindowResize();

var ControlMode = {
	ROAMING: 0,
	TARGET: 1,
};
var controlMode = ControlMode.ROAMING;

var targetCenter;

var TARGET_RADIUS = 10;
var MAX_ACCELERATION = 50000;
var MAX_SPEED = 5000000;
var MAX_ROTATION_ACCELERATION = 0.05;
var MAX_ROTATION_SPEED = 0.5;
var SPEED_ANGLE_DECREASE = 1;
var speed = new NumberControl(0, NumberControl.LINEAR, MAX_ACCELERATION);
var rotationSpeed = new NumberControl(0, NumberControl.LINEAR, MAX_ROTATION_ACCELERATION);

var view = new ol.View({
	center: ol.proj.fromLonLat([-3.042762,48.782753]),
	minZoom: 4,
	zoom: 6,
});

var points = [
    ol.proj.fromLonLat([-3.042762,48.782753]),
    ol.proj.fromLonLat([5.042762,38.782753]),
    ol.proj.fromLonLat([-5.042762,32.782753]),
    ol.proj.fromLonLat([2.042762,28.782753]),
];
var lineString = new ol.geom.LineString(points, 'XY');
var lineString = new ol.geom.Circle(ol.proj.fromLonLat([-3.042762,48.782753]), 500000);
var lineStringFeature = new ol.Feature({
	geometry: lineString,
});
lineStringFeature.setStyle(new ol.style.Style({
	fill: new ol.style.Fill({
		color: 'rgba(221, 99, 0, 0.5)'
	}),
	stroke: new ol.style.Stroke({
		color: '#f5267A',
		lineDash: [50, 50],
		width: 2,
		miterLimit: 100,
	}),
}));

var map = new ol.Map({
	controls: [
		new ol.control.Zoom({}),
	],
	interactions: [
	],
	layers: [
		new ol.layer.Tile({
			source: new ol.source.TileImage({
				url: 'tiles/{z}/{x}/{y}.png',
				wrapX: true,
			}),
		}),
		new ol.layer.Vector({
			source: new ol.source.Vector({
				features: [
					// lineStringFeature,
				],
			}),
		}),
	],
	renderer: ['webgl', 'canvas'],
	target: 'map',
	view: view,
});

map.on('pointerdown', function(evt) {
	controlMode = ControlMode.TARGET;
	targetCenter = evt.coordinate;

	var element = document.createElement('div');
	element.style.left = evt.pixel[0] + 'px';
	element.style.top = evt.pixel[1] + 'px';
	targetFeedbackElement.appendChild(element);

	setTimeout(function() {
		element.remove();
	}, 300);
});

function rotateButtonDownHandler(target) {
	return function(event) {
		event.preventDefault();
		controlMode = ControlMode.ROAMING;
		rotationSpeed.target = target;
	};
}

function rotateButtonUpHandler() {
	return function(event) {
		event.preventDefault();
		rotationSpeed.target = 0;
	};
}

document.getElementById('rotate-left').addEventListener('mousedown', rotateButtonDownHandler(1), false);
document.getElementById('rotate-left').addEventListener('touchstart', rotateButtonDownHandler(1), false);
document.getElementById('rotate-left').addEventListener('mouseup', rotateButtonUpHandler(), false);
document.getElementById('rotate-left').addEventListener('touchend', rotateButtonUpHandler(), false);

document.getElementById('rotate-right').addEventListener('mousedown', rotateButtonDownHandler(-1), false);
document.getElementById('rotate-right').addEventListener('touchstart', rotateButtonDownHandler(-1), false);
document.getElementById('rotate-right').addEventListener('mouseup', rotateButtonUpHandler(), false);
document.getElementById('rotate-right').addEventListener('touchend', rotateButtonUpHandler(), false);

document.getElementById('toggle-sail').addEventListener('singleclick', function(event) {
	event.preventDefault();
	if (controlMode != ControlMode.ROAMING) {
		controlMode = ControlMode.ROAMING;
		speed.target = 0;
	}
	else {
		if (speed.target)
			speed.target = 0;
		else
			speed.target = 1000;
	}
}, false);

function mod(a, b) {
	a=a%b;
	if (a<0) {
		a+=b;
		a=a%b;
	}
	if (a>=b*.5)
		a-=b;
	return a;
}

var time = Date.now();

function update() {
	var newTime = Date.now();
	var dt = Math.min(newTime - time, 200)*.001;
	time = newTime;

	var currentCenter = view.getCenter();
	var currentRotation = view.getRotation();

	switch (controlMode) {
	case ControlMode.ROAMING:
		speed.update(dt);
		rotationSpeed.update(dt);

		currentRotation = mod(currentRotation + rotationSpeed.current * dt, 2 * Math.PI);

		currentCenter[0] -= Math.sin(currentRotation) * dt * speed.current;
		currentCenter[1] += Math.cos(currentRotation) * dt * speed.current;
		break;

	case ControlMode.TARGET:
		var dx = targetCenter[0] - currentCenter[0];
		var dy = targetCenter[1] - currentCenter[1];
		var length = Math.sqrt(dx * dx + dy * dy);
		speed.target = Math.min(Math.sqrt(length * MAX_ACCELERATION), MAX_SPEED);
		if (length > TARGET_RADIUS) {
			var targetRotation = Math.atan2(-dx, dy);
			var rotationOffset = mod(targetRotation - currentRotation, 2 * Math.PI);
			var abs = Math.abs(rotationOffset),
				sign = Math.sign(rotationOffset);
			speed.target = Math.max(speed.target * (1 - abs * SPEED_ANGLE_DECREASE), 0);
			speed.update(dt);

			rotationSpeed.target = sign * Math.min(Math.sqrt(abs * MAX_ROTATION_ACCELERATION), MAX_ROTATION_SPEED);
			rotationSpeed.update(dt);
			currentRotation += rotationSpeed.current * dt;
		} else {
			speed.current = 0;
			currentCenter = targetCenter;
		}

		currentCenter[0] -= Math.sin(currentRotation) * dt * speed.current;
		currentCenter[1] += Math.cos(currentRotation) * dt * speed.current;
		break;
	}

	view.animate({
		center: currentCenter,
		rotation: currentRotation,
		duration: 0,
	});

	compassBackgroundElement.style.transform = 'rotate(' + currentRotation + 'rad)';
}

map.on('precompose', update);
