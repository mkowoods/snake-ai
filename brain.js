


class PlanningAgent { 
    constructor(actions, getState, setAction) {
        this.actions = actions
        this.getState = getState
        this.setAction = setAction
    }



    senseAndAct(){
        const state = this.getState()
        const {snake, food, dx, dy, lastAction} = state
        const head = state.snake[0]
        
        let bestDistance = Infinity
        let bestAction = null


        Object.keys(this.actions).forEach(action => {
            const actionVector = this.actions[action]
            const newHead = {x : (head.x + actionVector.dx), y : (head.y + actionVector.dy)}
            const manhattanDistance = Math.abs(newHead.x - food.x) + Math.abs(newHead.y - food.y)

            console.warn(manhattanDistance, bestDistance, action, lastAction, dx, dy, actionVector)

            if ((dx === -actionVector.dx) && (dy === -actionVector.dy)){
                return
            }
            // console.warn(manhattanDistance, bestDistance, action, lastAction)
            if (manhattanDistance === bestDistance){ 
                if( actionVector.dx === dx && actionVector.dy === dy ){
                    console.warn("match", action, lastAction)
                    bestDistance = manhattanDistance
                    bestAction = action    
                }
                // return
            }
            if (manhattanDistance < bestDistance){ 
                bestDistance = manhattanDistance
                bestAction = action
                // return
            }

        })
        console.warn('bestAction', bestAction, head, food, bestDistance)
        this.setAction(bestAction)
        
    }
}

export default PlanningAgent