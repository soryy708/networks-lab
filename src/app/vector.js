/**
 * 2-dimensional vector
 */
class Vector2D {
    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Calculate new vector which is result of subtraction of `otherVector2D` from `this`
     * @param {Object} otherVector2D 
     */
    minus(otherVector2D) {
        return new Vector2D(this.x - otherVector2D.x, this.y - otherVector2D.y);
    }

    /**
     * Calculate new vector which is result of dot product of `this` and `otherVector2D`
     * https://en.wikipedia.org/wiki/Dot_product
     * @param {Object} otherVector2D 
     */
    dotProduct(otherVector2D) {
        return (this.x * otherVector2D.x) + (this.y * otherVector2D.y);
    }

    /**
     * Calculate scalar which is magnitude of `this` vector
     */
    magnitude() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
}

export default {
    Vector2D,
};
