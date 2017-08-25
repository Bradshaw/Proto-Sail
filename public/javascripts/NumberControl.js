/**
 * @constructor
 * @param value
 * @param update
 * @param rate higher -> faster
 */
function NumberControl(value, update, rate) {
	this.set(value);
	this.update = update;
	this.rate = rate;
}

/**
 * @param value
 */
NumberControl.prototype.set = function(value) {
	this.current = this.target = value;
};

/**
 * @this {NumberControl}
 */
NumberControl.LINEAR = function(dt) {
	var dv = dt * this.rate;
	if (this.current <= this.target && this.current + dv >= this.target || this.current >= this.target && this.current - dv <= this.target) {
		this.current = this.target;
		return true;
	} else if (this.target > this.current)
		this.current += dv;
	else
		this.current -= dv;
	return false;
};

/**
 * @this {NumberControl}
 */
NumberControl.EXP = function(dt) {
	this.current += (this.target - this.current) * (1 - Math.exp(- dt * this.rate));
};
