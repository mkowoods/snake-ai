
function choose (choices) {
    const index = Math.floor(Math.random() * choices.length)
    return choices[index]
}

class PriorityQueue {
    // Defines a Max Priority Queue based on the value
    constructor () {
        this.heap = []
    }

    get heapSize () {
        return this.heap.length
    }

    insert (value, priority) {
        const newNode = { value, priority }
        this.heap.push(newNode)
        let currentIdx = this.heap.length - 1
        let parentIdx = Math.ceil(currentIdx / 2) - 1

        while (this.heap[parentIdx] && this.heap[currentIdx].priority > this.heap[parentIdx].priority) {
            const parent = this.heap[parentIdx]
            this.heap[parentIdx] = newNode
            this.heap[currentIdx] = parent
            currentIdx = parentIdx
            parentIdx = Math.ceil(currentIdx / 2) - 1
        }
    }

    remove () {
        if (this.heapSize === 0) {
            throw new Error('No Nodes in Heap')
        }

        if (this.heapSize === 1) {
            return this.heap.pop()
        }

        if (this.heapSize === 2) {
            const removed = this.heap[0]
            this.heap[0] = this.heap.pop()
            return removed
        }

        // take out the element at the top of the heap
        const removed = this.heap[0]
        this.heap[0] = this.heap.pop()

        // now push the value down the heap
        let currentIdx = 0
        let leftIdx = 2 * currentIdx + 1
        let rightIdx = 2 * currentIdx + 2

        let maxChildIdx = this.heap[rightIdx] && this.heap[rightIdx].priority >= this.heap[leftIdx].priority ? rightIdx : leftIdx

        while (this.heap[maxChildIdx] && this.heap[maxChildIdx].priority >= this.heap[currentIdx].priority) {
            const child = this.heap[maxChildIdx]
            const currentNode = this.heap[currentIdx]
            this.heap[currentIdx] = child
            this.heap[maxChildIdx] = currentNode

            currentIdx = maxChildIdx
            leftIdx = 2 * currentIdx + 1
            rightIdx = 2 * currentIdx + 2
            maxChildIdx = this.heap[rightIdx] && this.heap[rightIdx].priority >= this.heap[leftIdx].priority ? rightIdx : leftIdx
        }
        return removed
    }
}

class BaseAgent {
    constructor (actions, getState, setAction) {
        this.actions = actions
        this.getState = getState
        this.setAction = setAction
    }

    isDead (state) {
        const { snake, gameCanvas } = state
        const head = snake[0]
        if ((snake.slice(1, snake.length).some(el => ((el.x === head.x) && (el.y === head.y))))) {
            return true
        }
        const hitLeftWall = snake[0].x < 0
        const hitRightWall = snake[0].x > gameCanvas.width - 10
        const hitToptWall = snake[0].y < 0
        const hitBottomWall = snake[0].y > gameCanvas.height - 10

        return hitLeftWall || hitRightWall || hitToptWall || hitBottomWall
    }

    distanceFromHeadToFood (state) {
        const { snake, food } = state
        return Math.abs(snake[0].x - food.x) + Math.abs(snake[0].y - food.y)
    }

    getAvailableActions (state) {
        return Object.keys(this.actions).filter(action => {
            if ((state.dx === -this.actions[action].dx) && (state.dy === -this.actions[action].dy)) {
                return false
            }
            return true
        })
            .sort() // sort to split ties consistently
    }
}

export class SeekingAgent extends BaseAgent {
    // This is a simple agent that simply navigates toward the food
    senseAndAct () {
        const state = this.getState()
        const { food, dx, dy } = state
        const head = state.snake[0]

        let bestDistance = Infinity
        let bestAction = null

        this.getAvailableActions(state).forEach(action => {
            const actionVector = this.actions[action]
            const newHead = { x: (head.x + actionVector.dx), y: (head.y + actionVector.dy) }
            const manhattanDistance = Math.abs(newHead.x - food.x) + Math.abs(newHead.y - food.y)

            // dont backtrack
            if (manhattanDistance === bestDistance) {
                if (actionVector.dx === dx && actionVector.dy === dy) {
                    bestDistance = manhattanDistance
                    bestAction = action
                }
            }
            if (manhattanDistance < bestDistance) {
                bestDistance = manhattanDistance
                bestAction = action
            }
        })
        this.setAction(bestAction)
    }
}

export class PlanningAgent extends BaseAgent {
    getNextState (state, action) {
        const newState = window._.cloneDeep(state)
        const { snake } = newState
        const head = { x: snake[0].x + this.actions[action].dx, y: snake[0].y + this.actions[action].dy }
        newState.snake.unshift(head)
        newState.snake.pop()
        newState.dx = this.actions[action].dx
        newState.dy = this.actions[action].dy
        return newState
    }

    getBestAction (state, depth = 5) {
    // implements a variation of A* Searc
        const initState = { ...state, path: [], distance: this.distanceFromHeadToFood(state) }

        const pq = new PriorityQueue()
        const seenNodes = new Set()
        let seenNodeCtr = 0
        const getNodeValue = ({ distance, path }) => (distance) / (path.length + 1)
        const getHashKey = ({ snake }) => `${snake[0].x},${snake[0].y}`
        pq.insert(initState, -getNodeValue(initState))
        let lastNode = null

        while (pq.heapSize > 0) {
            const el = pq.remove()
            const node = el.value
            lastNode = node
            seenNodes.add(getHashKey(node))

            seenNodeCtr++
            // found goal
            if (node.distance === 0 || seenNodeCtr > 1000) {
                console.warn('Found Goal', seenNodeCtr, node.path.length)
                if (seenNodeCtr > 200) {
                    console.warn(seenNodes)
                }
                // debugger;
                return node.path[0]
            }

            this.getAvailableActions(node).forEach(action => {
                const nextState = this.getNextState(node, action)
                nextState.distance = this.distanceFromHeadToFood(nextState)
                if (this.isDead(nextState) || seenNodes.has(getHashKey(nextState))) {

                } else {
                    // prevent the same node from being enqueued
                    seenNodes.add(getHashKey(nextState))
                    nextState.path = [...nextState.path, action]
                    pq.insert(nextState, -getNodeValue(nextState))
                }
            })
        }
        return lastNode.path[0]
    }

    senseAndAct () {
        const state = this.getState()
        console.table(state.food)
        const action = this.getBestAction(state)
        this.setAction(action)
    }
}

export class MCTSAgent extends BaseAgent {
    getNextState (state, action) {
        const newState = window._.cloneDeep(state)
        const { snake } = newState
        const head = { x: snake[0].x + this.actions[action].dx, y: snake[0].y + this.actions[action].dy }
        newState.snake.unshift(head)
        newState.snake.pop()
        newState.dx = this.actions[action].dx
        newState.dy = this.actions[action].dy
        return newState
    }

    getBestAction (state, maxEvaluations = 30000) {
        const node = state

        const actionsScore = {}
        const actions = this.getAvailableActions(node)
        let i = 200
        while (i > 0) {
            actions.forEach(action => {
                let nextState = this.getNextState(node, action)
                let distance = this.distanceFromHeadToFood(nextState)
                let died = false
                let steps = 0
                while (!(died || distance === 0) && steps < 20) {
                    const nextAction = choose(this.getAvailableActions(nextState))
                    nextState = this.getNextState(nextState, nextAction)
                    distance = this.distanceFromHeadToFood(nextState)
                    died = this.isDead(nextState)
                    steps++
                }
                // console.warn(died, steps, distance)
                // debugger;
                actionsScore[action] = actionsScore[action] || 0
                if (died) {
                    actionsScore[action] += -100
                } else if (distance === 0) {
                    actionsScore[action] += 10000
                } else {
                    actionsScore[action] += (1000 - distance)
                }
            })
            i--
        }

        console.table(actionsScore)
        let bestAction = null
        let bestDistance = -Infinity
        Object.keys(actionsScore).forEach(k => {
            if (actionsScore[k] > bestDistance) {
                bestAction = k
                bestDistance = actionsScore[k]
            }
        })
        return bestAction
    }

    senseAndAct () {
        const state = this.getState()
        // console.table(state.food)
        const action = this.getBestAction(state)
        this.setAction(action)
    }
}
