class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    minus(otherVector2D) {
        return new Vector2D(this.x - otherVector2D.x, this.y - otherVector2D.y);
    }

    dotProduct(otherVector2D) {
        return (this.x * otherVector2D.x) + (this.y * otherVector2D.y);
    }

    magnitude() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
}

export default {
    Vector2D,
};
