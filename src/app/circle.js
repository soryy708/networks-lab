class Circle {
    /**
     * 
     * @param {Number} radius 
     * @param {Object} position 
     */
    constructor(radius, position) {
        this.radius = radius;
        this.position = position;
        this.color = 'white';
        this.colorAlpha = 1;
    }

    /**
     * Defines how this object is to be rendered
     * @param {*} canvasContext https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
     */
    render(canvasContext) {
        canvasContext.save();
        canvasContext.fillStyle = 'transparent';
        canvasContext.globalAlpha = this.colorAlpha;
        canvasContext.strokeStyle = this.color;
        canvasContext.beginPath();
        canvasContext.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        canvasContext.stroke();
        canvasContext.restore();
    }

    /**
     * Checks if `this` circle intersects with `otherCircle`
     * @param {Object} otherCircle 
     */
    collides(otherCircle) {
        return (this.radius + otherCircle.radius) >= this.position.minus(otherCircle.position).magnitude();
    }

    /**
     * Checks if `this` circle contains `position` in it's area
     * @param {Object} position Vector2D
     */
    containsPoint(position) {
        return this.radius >= this.position.minus(position).magnitude();
    }
}

export default Circle;
