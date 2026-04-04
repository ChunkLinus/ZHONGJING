const generateDoublePinyinSingleChar = function(pinyin, scheme)
{
	// Check for whole word match.
	if (pinyin in scheme.whole)
		return scheme.whole[pinyin]

	// Else, if pinyin is exactly 2 characters, push unchanged.
	else if (pinyin.length == 2)
		return pinyin

	// Else, break up word into start and end sections.
	let cutoff = pinyin.length > 1 && pinyin.charAt(1) == 'h' ? 2 : 1
	let start = pinyin.substring(0, cutoff)
	let end = pinyin.substring(cutoff)

	// Find match in scheme.
	start = scheme.start[start] || start
	end = scheme.end[end] || end

	// Combine start + end.
	if (Array.isArray(start))
	{
		if (Array.isArray(end))
			return start.reduce((result, startString) => {
				end.forEach(endString => {
					result.push(`${startString}${endString}`)
				})
				return result
			}, [])
		else
			return start.map(startString => `${startString}${end}`)
	}

	else if (Array.isArray(end))
		return end.map(endString => `${start}${endString}`)
	
	return `${start}${end}`
}

export const generateDoublePinyin = function(pinyins, isSingleChar)
{
	if (!("allowDoublePinyin" in save && save.allowDoublePinyin != null))
		return []

	// Get scheme.
	let scheme = doublePinyin[save.allowDoublePinyin]

	// If word is just single character.
	if (isSingleChar)
	{
		// In Chinese, if word is single character without context
		// it can have a multitude of possible pinyins.
		let results = []
		for (const pinyin of pinyins[0])
		{
			let generatedDoublePinyin = generateDoublePinyinSingleChar(pinyin, scheme)
			if (Array.isArray(generatedDoublePinyin))
				results = [ ...results, ...generatedDoublePinyin ]
			else results.push(generatedDoublePinyin)
		}
		return [ ...new Set(results) ]
			.map(py => { return { word: py, increments: py.length }})
	}

	// If word is multi-character.
	else
	{
		let results = []
		let schemeResult = []
		for (const pinyin of pinyins)
		{
			let generatedDoublePinyin = generateDoublePinyinSingleChar(pinyin[0], scheme)
			if (!Array.isArray(generatedDoublePinyin))
			{
				if (schemeResult.length == 0)
					schemeResult.push({
						word: generatedDoublePinyin,
						increments: [ generatedDoublePinyin.length ]
					})
				else
					for (let i = 0; i < schemeResult.length; i++)
					{
						schemeResult[i].word += generatedDoublePinyin
						schemeResult[i].increments.push(generatedDoublePinyin.length)
					}
			}
			else
			{
				if (schemeResult.length == 0)
					schemeResult = generatedDoublePinyin.map(py => {
						return {
							word: py,
							increments: [ py.length ]
						}
					})
				else
					schemeResult = schemeResult.reduce((result, current) => {
						for (const py of generatedDoublePinyin)
							result.push({
								word: `${current.word}${py}`,
								increments: [ ...current.increments, py.length ]
							})
						return result
					}, [])
			}
		}
		schemeResult.forEach(py => {
			if (!results.some(res => res.word == py.word))
				results.push(py)
		})
		return results
	}
}

const doublePinyin = [

	// 自然码
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'l', an: 'j', ang: 'h', ao: 'k', ei: 'z',
			en: 'f', eng: 'g', ia: 'w', ian: 'm', iang: 'd',
			iao: 'c', ie: 'x', iong: 's', in: 'n', ing: 'y',
			iu: 'q', ong: 's', ou: 'b', ua: 'w', uai: 'y',
			uan: 'r', uang: 'd', ue: 't', ui: 'v', un: 'p',
			uo: 'o', ve: 't'
		},
		whole: {
			 a: 'aa', ang: 'ah', e: 'ee', eng: 'eg', o: 'oo'
		}
	},

	// 智能ABC
	{
		start: {
			ch: 'e', sh: 'v', zh: 'a'
		},
		end: {
			ai: 'l', an: 'j', ang: 'h', ao: 'k', ei: 'q',
			en: 'f', eng: 'g', ia: 'd', ian: 'w', iang: 't',
			iao: 'z', ie: 'x', iong: 's', in: 'c', ing: 'y',
			iu: 'r', ong: 's', ou: 'b', ua: 'd', uai: 'c',
			uan: 'p', uang: 't', ue: ['m', 'v'], ui: 'm', un: 'n',
			uo: 'o', ve: ['m', 'v']
		},
		whole: {
			a: 'oa', ai: 'ol', an: 'oj', ang: 'oh', ao: 'ok',
			e: 'oe', ei: 'oq', en: 'of', eng: 'og', er: 'or',
			o: 'oo', ou: 'ob'
		}
	},

	// 星空双拼
	{
		start: {
			ch: 'c', sh: 's', zh: 'z'
		},
		end: {
			ai: 'h', an: 'j', ang: 'p', ao: 'k', ei: 'w',
			en: 'n', eng: 'm', ia: 's', ian: 'f', iang: 'c',
			iao: 'd', ie: 'x', iong: 'l', in: 'b', ing: 'g',
			iu: 'q', ong: 'l', ou: 'r', ua: 's', uai: 'g',
			uan: 't', uang: 'c', ue: ['h','z' ], ui: 'v', un: 'y',
			uo: 'o', ve: ['h','z']
		},
		whole: {
			a: 'va', ai: 'vh', an: 'vj', ang: 'vp', ao: 'vk',
			e: 've', ei: 'vw', en: 'vn', eng: 'vm', er: 'vu',
			o: 'vo', ou: 'vr'
		}
	},

	// 小浪双拼
	{
		start: {
			ch: 'i', sh: 'v', zh: 'e'
		},
		end: {
			ai: 'k', an: 'j', ang: 'h', ao: 's', ei: 'w',
			en: 'm', eng: 'n', ia: 'k', ian: 'f', iang: 'm',
			iao: 'c', ie: 'p', iong: 'j', in: 'd', ing: 'v',
			iu: 't', ong: 'l', ou: 'r', ua: 'f', uai: 'v',
			uan: 'g', uang: 'z', ue: 'b', ui: 'd', un: 'y',
			uo: 'o', v: 'x', ve: 'b'
		},
		whole: {
			a: 'aa', ang: 'ah', e: 'uu', ei: 'ui', en: 'un',
			eng: 'un', er: 'ur', o: 'oo'
		}
	},

	// 开源小鹳
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'k', an: 'j', ang: 'h', ao: 'c', ei: 'w',
			en: 'f', eng: 'g', ia: 'x', ian: 'm', iang: 'l',
			iao: 'n', ie: 'p', iong: 's', in: 'b', ing: 'd',
			iu: 'q', ong: 's', ou: 'z', ua: 'x', uai: 'd',
			uan: 'r', uang: 'l', ue: ['k', 't'], ui: 'v', un: 'y',
			uo: 'o', ve: 't'
		},
		whole: {
			a: ['aa', 'oa'], ai: ['ai', 'ok'], an: ['an', 'oj'], ang: ['ah', 'oh'], ao: ['ao', 'oc'],
			e: ['ee', 'oe'], ei: ['ei', 'ow'], en: ['en', 'of'], eng: ['eg', 'og'], er: ['er', 'or'],
			o: 'oo', ou: ['ou', 'oz']
		}
	},

	// 拼音加加
	{
		start: {
			ch: 'u', sh: 'i', zh: 'v'
		},
		end: {
			ai: 's', an: 'f', ang: 'g', ao: 'd', ei: 'w',
			en: 'r', eng: 't', ia: 'b', ian: 'j', iang: 'h',
			iao: 'k', ie: 'm', iong: 'y', in: 'l', ing: 'q',
			iu: 'n', ong: 'y', ou: 'p', ua: 'b', uai: 'x',
			uan: 'c', uang: 'h', ue: 'x', ui: 'v', un: 'z',
			uo: 'o', ve: 'x'
		},
		whole: {
			a: 'aa', ai: 'as', an: 'af', ang: 'ag', ao: 'ad',
			e: 'ee', ei: 'ew', en: 'er', eng: 'et', er: 'eq',
			o: 'oo', ou: 'op'
		}
	},

	// 键道双拼3
	{
		start: {
			ch: ['j', 'w'], sh: 'e', zh: ['f', 'q']
		},
		end: {
			a: 'p', ai: 'f', an: 'e', ang: 'h', ao: 'z',
			e: 'j', ei: 'w', en: 'n', eng: 't', i: 'k',
			ia: 'p', ian: 'd', iang: 'x', iao: 'q', ie: 'c',
			iong: 'y', in: 'b', ing: 'g', iu: 's', o: 'l',
			ong: 'y', ou: 's', u: 'm', ua: 'c', uai: 'd',
			uan: 'r', uang: 'x', ue: 'f', ui: 'b', un: 'w',
			uo: 'l', v: 'l', ve: 'f'
		},
		whole: {
			a: 'xp', ai: 'xf', an: 'xe', ang: 'xh', ao: 'xz',
			e: 'xj', ei: 'xw', en: 'xn', eng: 'xt', er: 'xm',
			o: 'xl', ou: 'xs', ju: 'jl', qu: 'ql', xu: 'xl',
			yu: 'yl'
		}
	},

	// 键道双拼6
	{
		start: {
			ch: ['j', 'w'], sh: 'e', zh: ['f', 'q']
		},
		end: {
			a: 's', ai: 'h', an: 'f', ang: 'p', ao: 'z',
			ei: 'w', en: 'n', eng: 'r', i: 'k', ia: 's',
			ian: 'm', iang: 'x', iao: 'c', ie: 'd', iong: 'y',
			in: 'b', ing: 'g', iu: 'q', o: 'l', ong: 'y',
			ou: 'd', u: 'j', ua: 'q', uai: 'g', uan: 't',
			uang: ['x', 'm'], ue: 'h', ui: 'b', un: 'w', uo: 'l',
			v: 'l', ve: 'h'
		},
		whole: {
			a: 'xs', ai: 'xh', an: 'xf', ang: 'xp', ao: 'xz',
			e: 'xe', ei: 'xw', en: 'xn', eng: 'xr', er: 'xj',
			o: 'xl', ou: 'xd', cha: 'ws', chai: 'jh', chan: 'jf',
			chang: 'jp', chen: 'jn', cheng: 'jr', chi: 'wk', chong: 'wy',
			chou: 'wd', chu: 'jj', chua: 'wq', chuai: 'wg', chuan: 'wt',
			chuang: 'wx', chui: 'wb', chun: 'jw', chuo: 'wl', ju: 'jl',
			qu: 'ql', xu: 'xl', yu: 'yl', zha: 'fs', zhan: 'qf',
			zhang: 'qp', zhen: 'qn', zheng: 'qr', zhi: 'fk', zhong: 'fy',
			zhou: 'fd', zhu: 'qj', zhua: 'fq', zhuai: 'fg', zhuan: 'ft',
			zhuang: 'fx', zhui: 'fb', zhun: 'qw', zhuo: 'fl' 
		}
	},

	// 大牛双拼
	{
		start: {
			zh: ['a', 'o'], ch: 'i', sh: ['u', 'v']
		},
		end: {
			ai: 'h', an: 'd', ang: 'f', ao: 's', ei: 'w',
			en: 'k', eng: 'j', ia: 'k', ian: ['c', 'q'], iang: 'n',
			iao: 'm', ie: 'p', iong: 'l', in: 'b', ing: 'g',
			iu: 't', ong: 'l', ou: 'r', ua: 'q', uai: 'g',
			uan: 'z', uang: 'x', ue: ['h', 'x'], ui: ['n', 'v'], un: 'y',
			uo: 'o', ve: 'x'
		},
		whole: {
			a: 'ea', ai: 'eh', an: 'ed', ang: 'ef', ao: 'es',
			e: 'ee', ei: 'ew', en: 'ek', eng: 'ej', er: 'eu',
			o: 'eo', ou: 'er', juan: ['jz', 'jj'], jun: ['jy', 'jw'], quan: ['qz', 'qj'],
			qun: ['qy', 'qw'], xuan: ['xz', 'xj'], xun: ['xy', 'xw'], yuan: ['yz', 'yj'], yun: ['yy', 'yw']
		}
	},

	// 白云双拼方案.
	{
		start: {
			ch: 'i', sh: 'v', zh: 'u'
		},
		end: {
			ai: 'j', an: 'd', ang: 'f', ao: 'c', ei: 'w',
			en: 'k', eng: 'z', ia: 'k', ian: 'm', iang: 'h',
			iao: 'n', ie: 'p', iong: 'l', in: 'b', ing: 'g',
			iu: 't', ong: 'l', ou: 's', ua: 'x', uai: 'v',
			uan: 'r', uang: 'g', ue: 'j', ui: 'h', un: 'y',
			uo: 'o', ve: 'x'
		},
		whole: {
			a: 'aa', ang: 'af', e: 'ee', eng: 'ez', o: 'oo'
		}
	},

	// 国标双拼
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'k', an: 'f', ang: 'g', ao: 'c', ei: 'b',
			en: 'r', eng: 'h', ia: 'q', ian: 'd', iang: 'n',
			iao: 'm', ie: 't', iong: 's', in: 'l', ing: 'j',
			iu: 'y', ong: 's', ou: 'p', ua: 'q', uai: 'y',
			uan: 'w', uang: 'n', ue: 'x', ui: 'v', un: 'z',
			uo: 'o', ve: 'x'
		},
		whole: {
			a: 'aa', ai: 'ak', an: 'af', ang: 'ag', ao: 'ac',
			e: 'ae', ei: 'ab', en: 'ar', eng: 'ah', er: 'al',
			o: 'ao', ou: 'ap'
		}
	},

	// 蓝天双拼
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'd', an: 'j', ang: 'g', ao: 'c', ei: 'w',
			en: 'k', eng: 'z', ia: 'k', ian: 'm', iang: 'l',
			iao: 'n', ie: 'p', iong: 's', in: 'x', ing: 'f',
			iu: 't', ong: 's', ou: 'r', ua: 'q', uai: 'f',
			uan: 'h', uang: 'l', ue: 'y', ui: 'v', un: 'b',
			uo: 'o', ve: 'y'
		},
		whole: {
			a: 'aa', ang: 'ag', e: 'ee', eng: 'eg', o: 'oo'
		}
	},

	// 搜狗双拼
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'l', an: 'j', ang: 'h', ao: 'k', ei: 'z',
			en: 'f', eng: 'g', ia: 'w', ian: 'm', iang: 'd',
			iao: 'c', ie: 'x', iong: 's', in: 'n', ing: ';',
			iu: 'q', ong: 's', ou: 'b', ua: 'w', uai: 'y',
			uan: 'r', uang: 'd', ue: 't', ui: 'v', un: 'p',
			uo: 'o', v: 'y', ve: 't'
		},
		whole: {
			a: 'oa', ai: 'ol', an: 'oj', ang: 'oh', ao: 'ok',
			e: 'oe', ei: 'oz', en: 'of', eng: 'og', er: 'or',
			o: 'oo', ou: 'ob'
		}
	},

	// 微软双拼
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'l', an: 'j', ang: 'h', ao: 'k', ei: 'z',
			en: 'f', eng: 'g', ia: 'w', ian: 'm', iang: 'd',
			iao: 'c', ie: 'x', iong: 's', in: 'n', ing: ';',
			iu: 'q', ong: 's', ou: 'b', ua: 'w', uai: 'y',
			uan: 'r', uang: 'd', ue: ['t', 'v'], ui: 'v', un: 'p',
			uo: 'o', v: 'y', ve: 'v'
		},
		whole: {
			a: 'oa', ai: 'ol', an: 'oj', ang: 'oh', ao: 'ok',
			e: 'oe', ei: 'oz', en: 'of', eng: 'og', er: 'or',
			o: 'oo', ou: 'ob'
		}
	},

	// 小鹤双拼
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			ai: 'd', an: 'j', ang: 'h', ao: 'c', ei: 'w',
			en: 'f', eng: 'g', ia: 'x', ian: 'm', iang: 'l',
			iao: 'n', ie: 'p', iong: 's', in: 'b', ing: 'k',
			iu: 'q', ong: 's', ou: 'z', ua: 'x', uai: 'k',
			uan: 'r', uang: 'l', ue: 't', ui: 'v', un: 'y',
			uo: 'o', ve: 't'
		},
		whole: {
			a: 'aa', ang: 'ah', e: 'ee', eng: 'eg', o: 'oo'
		}
	},

	// 小月双拼
	{
		start: {
			ch: 'i', sh: 'u', zh: 'v'
		},
		end: {
			iu: "q", ei: "w", e: "e", uan: "r", er: "r",
			un: "t", ue: "y", ve: "y", u: "u", i: "i",
			o: "o", uo: "o", ie: "p", a: "a", an: "s",
			ang: "d", en: "f", eng: "g", ong: "h", iong: "h",
			ian: "j", ing: "k", uai: "k", iang: "l", uang: "l",
			ou: "z", ua: "x", ia: "x", ao: "c", ui: "v",
			v: "v", in: "b", ai: "n", iao: "m"
		},
		whole: {
			e: 'ee', eng: 'eg', o: 'oo', a: 'aa', ang: 'ad'
		}
	},

	// 韵标块拼
	{
		start: {
			zh: 'a', ch: 'u', sh: 'i'
		},
		end: {
			ai: 'p', an: 'z', ang: 'm', ao: 'c', ei: 'k',
			en: 'n', eng: 't', ia: 'j', ian: 'q', iang: 'r',
			iao: 'f', ie: 'y', iong: 'h', in: 'b', ing: 'g',
			iu: 'x', ong: 'h', ou: 'l', ua: 'w', uai: 'y',
			uan: 'd', uang: 'g', ue: 'w', ui: 'v', un: 's',
			uo: 'o', v: 'u', ve: 'w'
		},
		whole: {
			a: 'ea', ai: 'ep', an: 'ez', ang: 'em', ao: 'ec',
			e: 'ee', ei: 'eb', eng: 'eh', o: 'eo', ou: 'el'
		}
	},

	// 紫光双拼
	{
		start: {
			ch: 'a', sh: 'i', zh: 'u'
		},
		end: {
			ai: 'p', an: 'r', ang: 's', ao: 'q', ei: 'k',
			en: 'w', eng: 't', ia: 'x', ian: 'f', iang: 'g',
			iao: 'b', ie: 'd', iong: 'h', in: 'y', ing: ';',
			iu: 'j', ong: 'h', ou: 'z', ua: 'x', uai: 'y',
			uan: 'l', uang: 'g', ue: 'n', ui: 'n', un: 'm',
			uo: 'o', ve: 'n'
		},
		whole: {
			a: 'oa', ai: 'op', an: 'or', ang: 'os', ao: 'oq',
			e: 'oe', ei: 'ok', en: 'ow', eng: 'ot', er: 'oj',
			o: 'oo', ou: 'oz'
		}
	}
]