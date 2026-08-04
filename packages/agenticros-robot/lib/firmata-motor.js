/**
 * Minimal 3-pin (pwm/dir/cdir) motor helper matching johnny-five Motor CDIR semantics.
 * Uses a firmata Board for pinMode / digitalWrite / analogWrite only.
 */

const DEFAULT_THRESHOLD = 30;

function constrain(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class Motor {
  /**
   * @param {object} board - firmata Board instance
   * @param {object} options
   * @param {object} options.pins
   * @param {number|string} options.pins.pwm
   * @param {number|string} options.pins.dir
   * @param {number|string} options.pins.cdir
   * @param {number} [options.threshold=30]
   */
  constructor(board, options = {}) {
    if (!board) {
      throw new Error('Motor requires a firmata board');
    }
    const pins = options.pins || {};
    if (pins.pwm === undefined || pins.dir === undefined || pins.cdir === undefined) {
      throw new Error('Motor requires pins: { pwm, dir, cdir }');
    }

    this.board = board;
    this.threshold = options.threshold !== undefined ? options.threshold : DEFAULT_THRESHOLD;
    this.pins = {
      pwm: Number(pins.pwm),
      dir: Number(pins.dir),
      cdir: Number(pins.cdir)
    };
    this.direction = { value: 1 };

    board.pinMode(this.pins.pwm, board.MODES.PWM);
    board.pinMode(this.pins.dir, board.MODES.OUTPUT);
    board.pinMode(this.pins.cdir, board.MODES.OUTPUT);

    // Match johnny-five: initialize direction pins to forward
    this._setDirection(1);
  }

  _setDirection(value) {
    // CDIR: cdir = 1 ^ dir.value, dir = dir.value
    this.board.digitalWrite(this.pins.cdir, 1 ^ value);
    this.board.digitalWrite(this.pins.dir, value);
    this.direction = { value };
  }

  _setSpeed(speed) {
    let s = constrain(Math.round(Number(speed) || 0), 0, 255);
    if (s < this.threshold) {
      s = 0;
    }
    this.board.analogWrite(this.pins.pwm, s);
  }

  /**
   * Stop PWM (coast). Matches johnny-five Motor.stop().
   */
  stop() {
    this.board.analogWrite(this.pins.pwm, 0);
    return this;
  }

  /**
   * Drive forward at speed 0-255.
   * Matches johnny-five: stop → set dir → start(speed).
   */
  forward(speed) {
    this.stop();
    this._setDirection(1);
    this._setSpeed(speed);
    return this;
  }

  /**
   * Drive reverse at speed 0-255.
   */
  reverse(speed) {
    this.stop();
    this._setDirection(0);
    this._setSpeed(speed);
    return this;
  }
}
