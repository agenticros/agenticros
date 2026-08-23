/**
 * Quadrature-lite encoder poller using native firmata Board pin reads.
 * Pins: leftA, leftB, rightA, rightB. B-channel selects sign on each A edge.
 */

function readDigital(board, pin) {
  const entry = board.pins?.[pin];
  return entry && Number(entry.value) ? 1 : 0;
}

/**
 * @param {object} board - firmata Board
 * @param {number[]} pins - [leftA, leftB, rightA, rightB]
 * @param {{ addTicks: (dLeft: number, dRight: number) => void }} odom
 * @param {number} [intervalMs=10]
 * @returns {() => void} stop
 */
export function startFirmataEncoderPoller(board, pins, odom, intervalMs = 10) {
  const [leftA, leftB, rightA, rightB] = pins.map(Number);
  if ([leftA, leftB, rightA, rightB].some((p) => !Number.isFinite(p))) {
    throw new Error("encoder pins must be four numbers: leftA,leftB,rightA,rightB");
  }

  for (const pin of [leftA, leftB, rightA, rightB]) {
    board.pinMode(pin, board.MODES.INPUT);
    if (typeof board.reportDigitalPin === "function") {
      board.reportDigitalPin(pin, 1);
    }
  }

  let leftLast = readDigital(board, leftA);
  let rightLast = readDigital(board, rightA);

  const poll = setInterval(() => {
    const leftState = readDigital(board, leftA);
    const leftDir = readDigital(board, leftB);
    if (leftState !== leftLast) {
      odom.addTicks(leftDir !== leftState ? -1 : 1, 0);
      leftLast = leftState;
    }

    const rightState = readDigital(board, rightA);
    const rightDir = readDigital(board, rightB);
    if (rightState !== rightLast) {
      odom.addTicks(0, rightDir !== rightState ? 1 : -1);
      rightLast = rightState;
    }
  }, intervalMs);

  const stop = () => clearInterval(poll);
  board.on("close", stop);
  return stop;
}
