class Circle {
    constructor(radius, position) {
        this.radius = radius;
        this.position = position;
        this.color = 'white';
    }

    render(canvasContext) {
        canvasContext.strokeStyle = this.color;
        canvasContext.beginPath();
        canvasContext.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        canvasContext.stroke();
    }

    collides(otherCircle) {
        return (this.radius + otherCircle.radius) >= this.position.minus(otherCircle.position).magnitude();
    }
}

export default Circle;
