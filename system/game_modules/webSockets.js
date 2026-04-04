const READY_STATE = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
};

function parseWSURL(url) {
	if (typeof url !== 'string') throw new TypeError('WebSocket url must be a string');
	const m = url.match(/^ws:\/\/([^\/:]+)(?::(\d+))?(\/[\s\S]*)?$/i);
	if (!m) throw new URIError('Only ws:// URLs are supported');
	const host = m[1];
	const port = m[2] ? parseInt(m[2], 10) : 80;
	const path = m[3] || '/';
	return { host, port, path, origin: `http://${host}${port === 80 ? '' : ':' + port}` };
}

function randomBytes(n) {
	const arr = new Uint8Array(n);
	for (let i = 0; i < n; i++) arr[i] = (Math.random() * 256) | 0;
	return arr;
}

function toBase64(uint8) {
	const bin = Array.prototype.map.call(uint8, (x) => String.fromCharCode(x)).join('');
	if (typeof btoa === 'function') return btoa(bin);
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
	let str = bin;
	let output = '';
	for (let block, charCode, i = 0, map = chars; str.charAt(i | 0) || ((map = '='), i % 1); output += map.charAt(63 & (block >>> (8 - (i % 1) * 8)))) {
		charCode = str.charCodeAt((i += 3 / 4));
		if (charCode > 0xff) throw new Error('Invalid character for base64');
		block = (block << 8) | (charCode || 0);
	}
	return output;
}

function utf8Encode(str) {
	if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
	const out = [];
	for (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		if (c < 0x80) out.push(c);
		else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
		else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
	}
	return new Uint8Array(out);
}

function utf8Decode(uint8) {
	if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(uint8);
	let out = '', i = 0;
	while (i < uint8.length) {
		const c = uint8[i++];
		if (c < 0x80) out += String.fromCharCode(c);
		else if (c >= 0xc0 && c < 0xe0) { const c2 = uint8[i++]; out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f)); }
		else { const c2 = uint8[i++], c3 = uint8[i++]; out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f)); }
	}
	return out;
}

function concatUint8(a, b) {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

class Emitter {
	constructor() { this.listeners = {}; }
	addEventListener(type, fn) {
		if (!this.listeners[type]) this.listeners[type] = [];
		this.listeners[type].push(fn);
	}
	removeEventListener(type, fn) {
		const list = this.listeners[type];
		if (!list) return;
		const i = list.indexOf(fn);
		if (i >= 0) list.splice(i, 1);
	}
	dispatchEvent(evt) {
		const list = this.listeners[evt.type];
		if (list) for (const fn of list.slice()) try { fn.call(this, evt); } catch (e) {}
		const handler = this['on' + evt.type];
		if (typeof handler === 'function') try { handler.call(this, evt); } catch (e) {}
	}
}

export default class WebSocket extends Emitter {
	static get CONNECTING() { return READY_STATE.CONNECTING; }
	static get OPEN() { return READY_STATE.OPEN; }
	static get CLOSING() { return READY_STATE.CLOSING; }
	static get CLOSED() { return READY_STATE.CLOSED; }

	constructor(url, protocols) {
		super();
		this.url = url;
		this.protocols = protocols;
		this.protocol = '';
		this.binaryType = 'arraybuffer';
		this.readyState = READY_STATE.CONNECTING;

		this._socket = null;
		this._recvBuf = new Uint8Array(0);
		this._closing = false;

		this._open(url).catch((err) => this._fail(err));
	}

	async _open(url) {
		const { host, port, path, origin } = parseWSURL(url);
		const key = toBase64(randomBytes(16));
		const headers = [
			`GET ${path} HTTP/1.1`,
			`Host: ${host}${port === 80 ? '' : ':' + port}`,
			'Upgrade: websocket',
			'Connection: Upgrade',
			`Origin: ${origin}`,
			'Sec-WebSocket-Version: 13',
			`Sec-WebSocket-Key: ${key}`,
		];

		const socket = new Socket();
		await socket.connectTo(host, port);
		this._socket = socket;

		const reqStr = headers.join('\r\n') + '\r\n\r\n';
		await socket.asyncWrite(utf8Encode(reqStr).buffer);

		// Read HTTP response headers
		const headerBytes = await this._readUntilDoubleCRLF();
		const headerText = utf8Decode(headerBytes);
		if (!/^HTTP\/1\.[01] 101 /.test(headerText)) {
			throw new Error('WebSocket handshake failed');
		}

		this.readyState = READY_STATE.OPEN;
		this.dispatchEvent({ type: 'open' });
		this._readerLoop();
	}

	async _read(n) {
		// ensure we have at least n bytes in _recvBuf
		while (this._recvBuf.length < n) {
			const chunk = new Uint8Array(await this._socket.asyncRead(1)); // read at least 1 byte
			this._recvBuf = concatUint8(this._recvBuf, chunk);
		}
		const out = this._recvBuf.subarray(0, n);
		this._recvBuf = this._recvBuf.subarray(n);
		return out;
	}

	async _readUntilDoubleCRLF() {
		const pattern = [13, 10, 13, 10];
		while (true) {
			// search in current buffer
			for (let i = 0; i + 3 < this._recvBuf.length; i++) {
				if (
					this._recvBuf[i] === 13 && this._recvBuf[i + 1] === 10 &&
					this._recvBuf[i + 2] === 13 && this._recvBuf[i + 3] === 10
				) {
					const out = this._recvBuf.subarray(0, i + 4);
					this._recvBuf = this._recvBuf.subarray(i + 4);
					return out;
				}
			}
			const more = new Uint8Array(await this._socket.asyncRead(1));
			this._recvBuf = concatUint8(this._recvBuf, more);
		}
	}

	async _readerLoop() {
		try {
			while (this.readyState === READY_STATE.OPEN) {
				const h = await this._read(2);
				const fin = (h[0] & 0x80) !== 0;
				const opcode = h[0] & 0x0f;
				const masked = (h[1] & 0x80) !== 0;
				let len = h[1] & 0x7f;
				if (len === 126) {
					const ext = await this._read(2);
					len = (ext[0] << 8) | ext[1];
				} else if (len === 127) {
					const ext = await this._read(8);
					len = (ext[4] * 2 ** 24) + (ext[5] << 16) + (ext[6] << 8) + ext[7];
				}
				let mask = null;
				if (masked) mask = await this._read(4);
				const payload = len ? await this._read(len) : new Uint8Array(0);
				const data = masked ? payload.map((b, i) => b ^ mask[i % 4]) : payload;

				if (opcode === 0x8) {
					const code = len >= 2 ? (data[0] << 8) | data[1] : 1000;
					const reason = len > 2 ? utf8Decode(data.subarray(2)) : '';
					this._doClose(code, reason, true);
					break;
				} else if (opcode === 0x9) {
					this._sendFrame(0xA, data);
				} else if (opcode === 0xA) {
				} else if (opcode === 0x1 || opcode === 0x2) {
					const message = opcode === 0x1 ? utf8Decode(data) : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
					this.dispatchEvent({ type: 'message', data: message });
				} else if (opcode === 0x0) {
					this._fail(new Error('Fragmented frames are not supported'));
					break;
				}
				if (!fin) {
					this._fail(new Error('Fragmented frames are not supported'));
					break;
				}
			}
		} catch (err) {
			if (this.readyState === READY_STATE.OPEN) this._fail(err);
		}
	}

	async _sendFrame(opcode, payloadUint8) {
		if (this.readyState !== READY_STATE.OPEN) throw new Error('WebSocket is not open');
		const maskKey = randomBytes(4);
		const finOpcode = 0x80 | (opcode & 0x0f);
		let lenByte = 0x80;
		let extLen = null;
		let len = payloadUint8.length;
		if (len < 126) {
			lenByte |= len;
		} else if (len <= 0xffff) {
			lenByte |= 126;
			extLen = new Uint8Array([len >> 8, len & 0xff]);
		} else {
			lenByte |= 127;
			const hi = 0, hi2 = 0, hi3 = 0, hi4 = 0;
			const l = len >>> 0;
			extLen = new Uint8Array([hi, hi2, hi3, hi4, (l >>> 24) & 0xff, (l >>> 16) & 0xff, (l >>> 8) & 0xff, l & 0xff]);
		}
		const header = new Uint8Array([finOpcode, lenByte]);
		const masked = new Uint8Array(payloadUint8.length);
		for (let i = 0; i < payloadUint8.length; i++) masked[i] = payloadUint8[i] ^ maskKey[i % 4];

		let frame = header;
		if (extLen) frame = concatUint8(frame, extLen);
		frame = concatUint8(frame, maskKey);
		frame = concatUint8(frame, masked);
		await this._socket.asyncWrite(frame.buffer);
	}

	async send(data) {
		if (this.readyState !== READY_STATE.OPEN) throw new Error('WebSocket is not open');
		let bytes;
		if (typeof data === 'string') bytes = utf8Encode(data);
		else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
		else if (ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
		else throw new TypeError('Unsupported data type for WebSocket#send');
		await this._sendFrame(0x1 * (typeof data === 'string') + 0x2 * (typeof data !== 'string'), bytes);
	}

	async close(code = 1000, reason = '') {
		if (this.readyState === READY_STATE.CLOSING || this.readyState === READY_STATE.CLOSED) return;
		this.readyState = READY_STATE.CLOSING;
		this._closing = true;
		const payload = new Uint8Array(2 + (reason ? utf8Encode(reason).length : 0));
		payload[0] = (code >> 8) & 0xff; payload[1] = code & 0xff;
		if (reason) payload.set(utf8Encode(reason), 2);
		try { await this._sendFrame(0x8, payload); } catch (e) {}
		try { await this._socket.close(); } catch (e) {}
		this._doClose(code, reason, false);
	}

	_doClose(code, reason, fromServer) {
		if (this.readyState === READY_STATE.CLOSED) return;
		this.readyState = READY_STATE.CLOSED;
		this.dispatchEvent({ type: 'close', code, reason, wasClean: true });
	}

	_fail(err) {
		this.dispatchEvent({ type: 'error', error: err });
		this.readyState = READY_STATE.CLOSED;
		try { if (this._socket) this._socket.disconnect(); } catch (e) {}
		this.dispatchEvent({ type: 'close', code: 1006, reason: '', wasClean: false });
	}
}
