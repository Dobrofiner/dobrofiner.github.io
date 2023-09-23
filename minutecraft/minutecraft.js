const physics = { directions: [0.2, 0.6, 1.35], friction: [0.9999999, 0.5], turn: 0.005, gravity: 0.15, velocity: [0, 0, 0] }
const engine = { gameSize: [1048576, 1048576, 10], renderSize: 20, renderTimeout: 2000, chunkSize: 16, chunkInt: 1000, redrawInt: 1000, runInt: 20 }
const player = { coords: [0, 0, 0], angle: [0, 0], size: [0.9, 0.9, 1.9], actRange: 5, holding: 0 }
const viewer = { size: [0,0], perspective: 1000, coords: [0, 0, 0], angle: [0,0], mode: 1, limit: (Math.PI / 2) - 0.4, borders: false }
const colors =	[	false,	[0,0,0],	[128,128,128],	[60,200,60],	[200,200,60],	[60,120,200]	]
const frictions = [	0.99,	0.5,		0.5,			0.5,			0.5,			0.9				]
const terrains = [	false,	false,		15,				5,				2,				2				] // TODO: unify with colors & terrains?
const actions = [	{action:'left',  velocity:[-1,  0,  0], match:[{keyCode:37}, {keyCode:65}]},
					{action:'right', velocity:[ 1,  0,  0], match:[{keyCode:39}, {keyCode:68}]},
					{action:'forth', velocity:[ 0,  1,  0], match:[{keyCode:38}, {keyCode:87}]},
					{action:'back',  velocity:[ 0, -1,  0], match:[{keyCode:40}, {keyCode:83}]},
					{action:'jump',  velocity: [ 0,  0, 1], match:[{keyCode:32}], onceOnly: true },
					{action:'dig',   match:[{ button:0 }], onceOnly: true}, { action:'place', match:[{button:2}], onceOnly: true } ]
const getColor = (material, distance) => colors[material] !== undefined ? `rgb(${(multVS(colors[material], 1 - ((0.7 * distance) / engine.renderSize)).join(','))})` : material
/* Lookup Tables & Caches */ const knownFaces = {}, storedBlocks = {}, viewRange = {}, customPolygons = {}, intervals = {}, active = {}, fluids = [0, null]
/* Vector Library */         const thag = (a, b) => Math.sqrt(a.reduce((sum, c1, i) => (sum + ((b[i] - c1) ** 2)), 0)), multV = (a, b) => a.map((c, i) => b[i] * c), divV = (a, b) => a.map((c, i) => c / b[i]), addV = (a, b) => a.map((c, i) => b[i] + c), negV = (a, b) => a.map((c, i) => c - b[i]), multVS = (a, b) => a.map(c => b * c), divVS = (a, b) => a.map(c => c / b), addVS = (a, b) => a.map(c => b + c), negVS = (a, b) => a.map(c => c - b), eqV = (a, b) => a.findIndex((c, i) => c !== b[i]) === -1, eqVS = (a, b) => a.findIndex((c, i) => c !== b) === -1, setV = (a, index, b) => a.map((c, i) => i === index ? b : c)
/* Helper Utilities */       const notFalsey = a => a, isUndefined = a => a === undefined, byDistance = (a, b) => b.distance - a.distance, facesOrder = ([a, b, c, d]) => [a, c, d, b], isSolid = coords => fluids.indexOf(nodeCache.getNode(coords.map(Math.round))) === -1
/* Too Many One-Liners*/     const collides = (coords, size = [1, 1, 1]) => comb({ size: 2, c:coords, m: size }).find(isSolid) !== undefined, getNearest = (coords, size = [1, 1, 1]) => comb({ size: [2, 2, 1], c:coords, m: size }).map(a => ({ points: a, node: nodeCache.getNode(a.map(Math.round)) })).filter(({ node }) => (fluids.indexOf(node) === -1)).map(({ points, node }) => ({ distance: thag(points.map(Math.round), coords), node })).sort(byDistance).map(({ node }) => node).slice(-1)[0], getCubeNeighbors = coords => neighbors(coords, [2, 2, 2]).map(c => c[0].map(Math.round)).map(nodeCache.getNode), randomGenerator = seed => () => Math.abs((Math.log(seed++) * 10000) % 1), findAction = ev => ({ match }) => match.find((matcher) => Object.keys(matcher).reduce((accum, key) => accum && matcher[key] === ev[key], true)), mergeActive = (vl, a) => ((a.velocity) || (a.onceOnly === true && active[a.action] === 'done')) ? ((a.onceOnly ? (active[a.action] = 'done') : true) && { ...vl, vel: vl.vel.map((c, i) => c + (a.velocity[i] * physics.directions[i] * vl.fr)) }) : vl, behindYou = ({ coords: c }) => boundAngle(Math.atan2(c[1] - viewer.coords[1], c[0] - viewer.coords[0]) - viewer.angle[0]) < Math.PI, boundAngle = a => a < 0 ? ((Math.PI * 2) - (Math.abs(a) % (Math.PI * 2))): (a % (Math.PI * 2)), filterBlockPolygons = ({ faces, material }) => faces.map(face => ({ ...face, material, distance: thag(viewer.coords, face.center) })).sort(byDistance).slice(-3), reloadView = () => nodeCache.forRangeProcess(negVS(player.coords, engine.renderSize).map(Math.round), addVS([0, 0, 0], engine.renderSize * 2).map(Math.round), reloadNode).promise().then(() => Object.keys(viewRange).slice(0, 2000).filter(key => (Date.now() - viewRange[key].time) > engine.renderTimeout).forEach(key => delete viewRange[key])), canvasSize = event => ((canvas.width = window.innerWidth) && (canvas.height = window.innerHeight) && (viewer.size = [canvas.width, canvas.height])), getCubeFaces = (center, size = [1, 1, 1]) => neighbors(center, size).map(([cent, m, i]) => ({ center: cent, coords: facesOrder(comb({ s: setV([2, 2, 2], i, 1), c: setV(center, i, m===1 ? center[i] + size[i] : center[i]), m: size })) })), neighbors = (center, size = [1, 1, 1]) => [].concat(...[0, 1, 2].map(i => [1, -1].map(m => [ setV(center, i, center[i] + (size[i] / 2 * m)), m, i ])))
const rotate = (coords, center, angles) => { // rotate 3D coords by the angles about the center
	const dx = coords[0] - center[0], dy = coords[1] - center[1], dz = coords[2] - center[2]
	const sinA = Math.sin(angles[0]), cosA = Math.cos(angles[0]), sinB = Math.sin(angles[1]), cosB = Math.cos(angles[1])
	const y2 = dy * cosA - dx * sinA
	return	[ center[0] + (dx * cosA + dy * sinA), center[1] + (y2 * cosB - dz * sinB), center[2] + (dz * cosB + y2 * sinB) ]
}
const rotateI = (coords, center, angle) => rotate(rotate(coords, center, [0, -angle[1]]), center, [-angle[0], 0])
const project = ({ coords = [0, 0, 0], angle = [0, 0], perspective = 1000, size = [100, 100] }, pointCoords) => { // projects 3D coords into 2D coords given a view position & angle
	const rotated = rotate(pointCoords, coords, angle)
	const perspectiveDistance = perspective / (rotated[1] - coords[1])
	return perspectiveDistance < 0 ? false : [ ((rotated[0] - coords[0]) * perspectiveDistance) + (size[0] / 2), -((rotated[2] - coords[2]) * perspectiveDistance) + (size[1] / 2) ]
}
const drawPolygon = (context, points) => { // draws a closed polygon
	if (points.length < 3) return // polygons must have at least 3 points
	const [first, ...otherPoints] = points
	context.beginPath()
	context.moveTo(first[0], first[1])
	otherPoints.forEach(point => context.lineTo(point[0], point[1]))
	context.closePath()
	context.fill()
	context.stroke()
}
function comb({ d = 3, s = 2, m = 1, c = 0, centered = true }) {
	const ss = s instanceof Array ? s : Array(d).fill(s), ms = m instanceof Array ? m : Array(d).fill(m), cs = c instanceof Array ? c : Array(d).fill(c)
	return Array(ss.reduce((a, b) => a * b, 1)).fill(c).map((J, b) => Array(d).fill(c).reduce(({ b, r }, c, i) => {
		const csi = cs[i] - (centered ? ms[i] / 2 : 0)
		if (b === 0) return { b, r: r.concat(csi) }
		const mag = ss.slice(i + 1).reduce((a, b) => a * b, 1)
		if (mag > b) return { b, r: r.concat(csi) }
		const e = Math.floor(b / mag)
		return { b: b - (e * mag), r: r.concat([csi + (ms[i] * e)])}
	}, { b, r: [] }).r)
}
function Process(processor, initial = [], config = {}) {
	const { take = 1, delay = 0 } = config
	let resolve = false, reject = false, activeDelay = false, processed = 0
	const promise = new Promise((res, rej) => ((resolve = res) && (reject = rej))), step = data => processor(data, { statistics: { processed }}), stepWise = () => {
		const t1 = Date.now(), taken = queue.splice(0, take)
		return taken.forEach(t => step(t) || (processed += 1)) || (queue.length ? (activeDelay = setTimeout(stepWise, delay + Date.now() - t1)) : resolve({ processed }))
	}
	const queue = [].concat(initial)
	activeDelay = setTimeout(stepWise, delay)
	return { promise: () => promise }
}
function chunkLoader ({ chunkSize = 32, loadMarker = undefined, rangeMarker = null, processConfig = { take: 1000, delay: 0, autostart: true },  fieldRange = [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1], generator = coords => coords[coords.length - 1] === 0 ? 1 : 0 }) {
	const loadedData = {}, loadedChunks = [], getIndex = coords => coords.map(n => n.toString(36)).join(','), inrangeF = range => coords => !coords.find((c, i) => c < 0 || c >= range[i]), boundF = range => (coords, offset = 0) => coords.map((c, i) => c < 0 ? 0 : (c > (range[i] - offset) ? (range[i] - offset) : c)), loadChunksNear = (position, loadRange = thag([0, 0, 0], chunkSizes)) => comb({ d: fieldRange.length, s: 3, centered: false, c: -1 }).map(c => ({ coords: addV(chunkBound(divV(position, chunkSizes).map(Math.floor), 1), c), distance: thag(multV(addV(chunkBound(divV(position, chunkSizes).map(Math.floor), 1), addVS(c, 0.5)), chunkSizes), position) })).filter(({ distance, coords }) => (distance < loadRange) && chunkInrange(coords)).sort(byDistance).filter(({ coords, cacheIndex }) => (cacheIndex = getIndex(coords)) && loadedChunks.indexOf(cacheIndex) === -1 && (loadedChunks.push(cacheIndex) !== -1)).map(({ coords }) => forRangeProcess(multV(coords, chunkSizes), chunkSizes, (pcoords, index) => loadedData[index] !== undefined ? false : (loadedData[index] = generator(pcoords, index)))), setNode = (coords, value) => inrange(coords) ? loadedData[getIndex(coords)] = value : rangeMarker
	const bound = boundF(fieldRange), inrange = inrangeF(fieldRange)
	const chunkSizes = bound(chunkSize instanceof Array ? chunkSize : fieldRange.map(() => chunkSize))
	const chunkBound = boundF(divV(fieldRange, chunkSizes).map(Math.floor)), chunkInrange = inrangeF(divV(fieldRange, chunkSizes).map(Math.floor))
	const getNode = coords => { // get node at coords right now, or falsey
		if (!inrange(coords)) return rangeMarker
		const index = getIndex(coords)
		return (loadedData[index] !== undefined) ? loadedData[index] : loadMarker
	}
	const forRangeProcess = (USloadCoords, USloadSize, funct, processOpts = processConfig) => {
		const loadCoords = bound(USloadCoords), loadSize = bound(USloadSize)
		const forIndexToCoords = index => loadSize.map((c, i) => Math.floor(index / (Array(i).fill(0).map((a, j) => loadSize[j]).reduce((a, b) => a * b, 1))) % c) // TODO: this could be re-written to load closest first?
		return new Process((item, { statistics }) => {
			const coords = addV(forIndexToCoords(statistics.processed), loadCoords)
			funct(coords, inrange(coords) ? getIndex(coords) : -1)
		}, Array(loadSize.reduce((a, b) => a * b, 1)).fill(loadMarker), processOpts) // TODO: avoid filling array?
	}
	return { bound, getNode, setNode, getIndex, loadChunksNear, forRangeProcess }
}
const drawFace = ({ points, color }) => {
	context.strokeStyle = (viewer.borders ? (context.fillStyle = color) && 'black' : (context.fillStyle = color))
	drawPolygon(context, points)
}
const getFace = ({ material, distance, coords }) => {
	const points = coords.map(c => project(viewer, c)).filter(notFalsey)
	if (points.length < 3) return false
	const bounds = getBounds(points)
	return (bounds[0][1] < 0 || bounds[1][1] < 0 || bounds[0][0] > viewer.size[0] || bounds[1][0] > viewer.size[1]) ? false : { points, color: getColor(material, distance) }
}
const getBounds = polygon => [0, 1].map(xy => {
	const c = polygon.map(p => p[xy])
	return [Math.min(...c), Math.max(...c)]
})
const drawFrame = () => {
	const polygons = [].concat(...Object.values(viewRange).filter(behindYou).map(filterBlockPolygons), ...Object.values(customPolygons)).sort(byDistance).map(getFace).filter(notFalsey).slice(-1000)
	context.clearRect(0, 0, canvas.width, canvas.height)
	polygons.forEach(drawFace)
	if (animating) window.requestAnimationFrame(drawFrame)
}
const reloadNode = (coords, index) => {
	if (viewRange[index] !== undefined) return viewRange[index].time = Date.now()
	const material = nodeCache.getNode(coords)
	if (material < 1 || isUndefined(material)) return
	const faces = getFaces(coords)
	if (faces) viewRange[index] = { material, coords, faces, time: Date.now() }
}
const getFaces = coords => {
	const index = nodeCache.getIndex(coords)
	const knowNode = knownFaces[index]
	if (knowNode === false || knowNode instanceof Array) return knowNode
	const neighbors = getCubeNeighbors(coords)
	const pre = neighbors.find(isUndefined), faces = knowNode instanceof Object ? knowNode.faces : getCubeFaces(coords)
	const result = faces.filter((p, i) => neighbors[i] === 0 || isUndefined(neighbors[i]))
	return pre ? (knowNode instanceof Object ? (result.length ? result : false) : (knownFaces[index] = { faces })) : (knownFaces[index] = result.length ? result : false)
}
const move = direction => {
	const newPosition = addV(player.coords, direction)
	return collides(newPosition, multV(player.size, [1, 1, 0.5])) === false && collides(addV(newPosition, [0, 0, -1]), multV(player.size, [1, 1, 0.5])) === false
}
let running = false
const run = () => {
	running = setTimeout(run, engine.runInt)
	const actives = Object.values(active).filter(notFalsey), below = getNearest(addV(player.coords, [0, 0, -(player.size[2] - 0.5)]))
	const floorFriction = below > 0 ? frictions[below] : frictions[0]
	const rotated = rotateI(actives.reduce(mergeActive, {fr: 1 - floorFriction, vel: [0, 0, 0]}).vel, [0, 0, 0], [player.angle[0], 0])
	physics.velocity = addV(physics.velocity, [0, 0, -physics.gravity]).map((c,i) => {
		const d = (c + rotated[i]) * ((i !== 2) ? floorFriction : frictions[0]), v = [0, 0, 0]
		return (v[i] = d) && (move(v) ? ((player.coords = addV(player.coords, v)) && d) : 0)
	})
	if (player.coords[2] < -10) player.coords = addV(multV(nodeCache.bound(player.coords, 1), [1, 1, 0]), addV(multV(engine.gameSize, [0, 0, 1]), [0, 0, player.size[2]])) // if the player falls out of bounds, put them back in
	const _ = viewer.mode === 3 ? ((viewer.angle = [ boundAngle(player.angle[0] + Math.PI), -player.angle[1] ]) && (viewer.coords = addV(player.coords, rotateI([0, 10, 0], [0, 0, 0], player.angle))) && (customPolygons.player = filterBlockPolygons({ material: '#ff8855', faces: getCubeFaces(addV(player.coords, [0, 0, -0.5]), player.size) }))) : ((viewer.coords = player.coords) && (viewer.angle = player.angle) && (customPolygons.player ? delete customPolygons.player : true))
	player.holding ? (customPolygons.holding = filterBlockPolygons({ material: player.holding, faces: getCubeFaces(addV(player.coords, rotateI([Math.min(0.5, viewer.size[0] / 2000), 1, -0.2], [0, 0, 0], player.angle)), [0.2, 0.2, 0.2]) })) : (customPolygons.holding ? delete customPolygons.holding : true)
	if ((active.dig && active.dig !== 'done') || (active.place && active.place !== 'done')) {
		if (active.dig) active.dig = 'done'
		if (active.place) active.place = 'done'
		const rangeEnd = rotateI([0, player.actRange, 0], [0, 0, 0], player.angle)
		const gradient = multVS(rangeEnd, 1 / player.actRange), signs = rangeEnd.map(Math.sign)
		const bsd = [], bsp = [], factors = [].concat(...rangeEnd.map((c, j) => Array(Math.floor(Math.abs(c))).fill(0).map((c, i) => ({ face: j, dist: ((Math.round(player.coords[j] + i * signs[j]) + (0.5 * signs[j])) - player.coords[j]) / gradient[j] })))).filter(a => a.dist >= 0 && a.dist <= player.actRange).sort((a, b) => a.dist - b.dist)
		factors.forEach(factor => {
			const pn = addV(player.coords, multVS(gradient, factor.dist)), d = setV([0, 0, 0], factor.face, 0.5 * signs[factor.face])
			return ((bsd.push(addV(pn, d).map(Math.round)) !== -1) && (active.place ? bsp.push(addV(pn, multVS(d, -1)).map(Math.round)) : false))
		})
		const delI = bsd.findIndex(coords => fluids.indexOf(nodeCache.getNode(coords)) === -1)
		if (delI !== -1) return (active.dig ? placeBlock(bsd[delI], 0) : ((active.place && player.holding && bsp[delI][2] !== (engine.gameSize[2] - 1)) ? placeBlock(bsp[delI], player.holding) : false))
	}
}
const start = () => (intervals.chunks = setInterval(() => nodeCache.loadChunksNear(player.coords, engine.renderSize * 2), engine.chunkInt)) && (intervals.view = setInterval(reloadView, engine.redrawInt)) && (running = setTimeout(run, engine.runInt)) &&	window.requestAnimationFrame(drawFrame) && (animating = true), stop = () => clearTimeout(running) || (running = false) || (animating = false) || (Object.values(intervals).map(clearInterval) && false)
const urlParams = new URLSearchParams(window.location.search)
const seed = urlParams.has('seed') ? parseFloat(urlParams.get('seed')) : Math.random()
const random = randomGenerator(seed), newFourierTerm = (funct, [m = 1, n = 1, c = 0, d = 0]) => x => c + (m * funct(n * (x + d))), newFourierSeries = terms => x => terms.reduce((acc, term) => acc + term(x), 0), newFourierConfig = terms => ['x', 'y'].map(() => Array(terms).fill(0).map(() => [random(), random(), (random() - 0.5) * 2, (random() - 0.5) * 2]))
const terrainFunctions = terrains.map(c => c ? ((D2conf => ([x, y]) => D2conf[0](x) + D2conf[1](y))(newFourierConfig(c).map(cnf => newFourierSeries(cnf.map(n => newFourierTerm(Math.sin, n)))))) : () => 0)
const nodeCache = chunkLoader({ fieldRange: engine.gameSize, chunkSize: engine.chunkSize, generator: (coords, index) => (storedBlocks[index] !== undefined) ? parseInt(storedBlocks[index]) : (coords[2] === 0 ? 1 : (coords[2] === (engine.gameSize[2] - 1) ? 0 : Math.max(terrainFunctions.findIndex(f => f(coords) > coords[2]), 0)))})
const placeBlock = (coords, material = 0) => {
	const originalMaterial = nodeCache.getNode(coords)
	nodeCache.setNode(coords, material)
	if (fluids.indexOf(material) === -1 && !move([0, 0, 0])) return nodeCache.setNode(coords, originalMaterial)
	const index = nodeCache.getIndex(coords)
	const _ = (localStorage[storageKey] = localStorage[storageKey] + "|" + ([material, ...coords].join(','))) && (storedBlocks[index] = material)
	const refreshes = [[coords, index]].concat(neighbors(coords, [2, 2, 2]).map(c => c[0].map(Math.round)).map(coords => [coords, nodeCache.getIndex(coords)])).filter(([c, i]) => ((knownFaces[i] !== undefined) ? delete knownFaces[i] : true) && ((viewRange[i] !== undefined) ? delete viewRange[i] : true)).forEach(([c, i]) => reloadNode(c, i))
}
const storageKey = `minutecraft-custom-${seed}`
if (localStorage[storageKey] === undefined) localStorage[storageKey] = ""
localStorage[storageKey].split('|').filter(str => str.length).map(str => str.split(',').map(a => parseInt(a))).forEach(([material, ...coords]) => storedBlocks[nodeCache.getIndex(coords)] = material)
localStorage[storageKey] = "|" + (Object.entries(storedBlocks).map(([index, material]) => ([material, ...index.split(',').map(a => parseInt(a, 36))].join(','))).join('|'))
const lockPointerMouseMove = (element, callback) => {
	const lockChangeAlert = () => (document.pointerLockElement === element || document.mozPointerLockElement === element) ? document.addEventListener("mousemove", callback, false) : document.removeEventListener("mousemove", callback, false), bindAnyway = () => document.addEventListener("mousemove", callback, false)
	return (element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock) && (document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock) && (element.onclick = () => element.requestPointerLock()) && (document.addEventListener('pointerlockerror', bindAnyway, false) ||	document.addEventListener('mozpointerlockerror', bindAnyway, false) || document.addEventListener('pointerlockchange', lockChangeAlert, false) || document.addEventListener('mozpointerlockchange', lockChangeAlert, false))
}
const evDown = event => { // register action as active on press
	const action = actions.find(findAction(event))
	if (action && !active[action.action]) active[action.action] = action
}
const evUp = event => { // unregister action as active on release
	const action = actions.find(findAction(event))
	if (action) active[action.action] = false
}
player.coords = addV(multV(engine.gameSize, [0.5, 0.5, 1]), [0, 0, player.size[2]])
document.write(`<i style="text-align:center;width:100%;height:100px;line-height:100px;position:absolute;top:0;bottom:0;left:0;margin:auto;">loading...</i>`)
Promise.all(nodeCache.loadChunksNear(player.coords, engine.renderSize).map(l => l.promise())).then(reloadView).then(() => {
	(document.body.innerHTML = "<style>*{padding:0;margin:0;background:#8af;}</style><canvas></canvas>") && (window.canvas = document.getElementsByTagName('canvas')[0]) && (window.context = canvas.getContext('2d'))
	canvasSize()
	const _ = (window.addEventListener("resize", canvasSize) || document.addEventListener("keydown", evDown) || document.addEventListener("keyup", evUp) || document.addEventListener("mousedown", evDown) || document.addEventListener("mouseup", evUp))
	document.addEventListener("contextmenu", event => {
		if(event.preventDefault != undefined) event.preventDefault()
		if(event.stopPropagation != undefined) event.stopPropagation()
		return false
	})
	document.addEventListener("keydown", event => {
		const ki = parseInt(event.key)
		if (event.key == ki) player.holding = ki < colors.length ? ki : 0
	})
	lockPointerMouseMove(canvas, event => (player.angle[0] -= (event.movementX * physics.turn)) && (player.angle[1] += (event.movementY * physics.turn)) && (player.angle[0] = boundAngle(player.angle[0])) && ((player.angle[1] > viewer.limit) ? (player.angle[1] = viewer.limit) : true) && ((player.angle[1] < -viewer.limit) ? (player.angle[1] = -viewer.limit) : true)) // Look around with the cursor
	start()
})
// How much space do I have left?
