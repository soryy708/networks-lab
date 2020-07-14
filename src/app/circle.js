class Circle {
    constructor(radius, position) {
        this.radius = radius;
        this.position = position;
        this.color = 'white';
        this.colorAlpha = 1;
    }

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

    collides(otherCircle) {
        return (this.radius + otherCircle.radius) >= this.position.minus(otherCircle.position).magnitude();
    }

    containsPoint(position) {
        return this.radius >= this.position.minus(position).magnitude();
    }
}

export default Circle;
