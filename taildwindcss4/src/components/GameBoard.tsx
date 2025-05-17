import { useEffect, useState } from "react";
import Button from "./Button";
import { doc, getDoc, type WhereFilterOp } from 'firebase/firestore'
import { database } from '../firebase/firebaseClient.ts';

interface GameProps {
    fadeInGameProp: boolean,
}

interface Puzzle {
    coaster_objects: CoasterPuzzleObject[],
    correct_connections: ConnectionsSolutionObject[],
}

interface ConnectionsSolutionObject {
    name_sequence: string[],
    connections_object: FinalConnectionObject
}

interface FinalConnectionObject {
    quality: string,
    operator: WhereFilterOp,
    value: string | number,
    category: string,
    explanation: string,
}

interface CoasterPuzzleObject {
    name: string,
    imageURL: string,
}

interface GameStateInterface {
    date: string,
    solutionsSolved: ConnectionsSolutionObject[],
    coasterNames: CoasterPuzzleObject[],
    connectionSolutions: ConnectionsSolutionObject[],
    mistakesRemaining: number,
    revealHint1: boolean,
    revealHint2: boolean,
    revealHint3: boolean,
}

const fetchTodaysPuzzle = async (): Promise<Puzzle | null> => {
    try {

        const docId = new Date().toLocaleDateString('en-CA');
        //console.log("Attempting to fetch puzzle with ID: ", docId);

        const querySnapshot = await getDoc(doc(database, "daily_puzzles", docId))

        if (querySnapshot.exists()) {
            console.log("Fetched puzzle")
            return querySnapshot.data() as Puzzle
        }

        return null

    }
    catch (err) {
        console.log("There was an error fetching today's puzzle." + err);
        return null
    }
}

export default function GameBoard({ fadeInGameProp }: GameProps) {

    const [coversLoaded, setCoversLoaded] = useState(false);
    const [mistakesRemaining, setMistakesRemaining] = useState<number>(5);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [solutionsFound, setSolutionsFound] = useState<number>(0);
    const [discoveredSolutions, setDiscoveredSolutions] = useState<ConnectionsSolutionObject[]>([]);
    const [coasterNames, setCoasterNames] = useState<CoasterPuzzleObject[]>([]);
    const [connectionSolutions, setConnectionSolutions] = useState<ConnectionsSolutionObject[]>([]);
    const [revealHint1, setRevealHint1] = useState<boolean>(false);
    const [revealHint2, setRevealHint2] = useState<boolean>(false);
    const [revealHint3, setRevealHint3] = useState<boolean>(false);
    const [puzzleFinished, setPuzzleFinished] = useState<boolean>(false);

    useEffect(() => {

        const today = new Date().toLocaleDateString('en-CA');

        const fetchData = async () => {
            const puzzle = await fetchTodaysPuzzle();
            if (puzzle) {
                const shuffledNames = [...puzzle.coaster_objects].sort(() => 0.5 - Math.random())
                setCoasterNames(shuffledNames);
                setConnectionSolutions(puzzle?.correct_connections);
            }
        }

        const storedState = localStorage.getItem("coasterPuzzleState");
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            if (parsedState.date === today) {
                setCoasterNames(sortCoasterNames(parsedState.solutionsSolved, parsedState.coasterNames));
                setConnectionSolutions(parsedState.connectionSolutions)
                setMistakesRemaining(parsedState.mistakesRemaining);
                setRevealHint1(parsedState.revealHint1);
                setRevealHint2(parsedState.revealHint2);
                setRevealHint3(parsedState.revealHint3);
                setSolutionsFound(parsedState.solutionsSolved.length);
                setDiscoveredSolutions(parsedState.solutionsSolved)
                return;
            }
        }

        fetchData();

    }, [])

    useEffect(() => {
        if (!coversLoaded && coasterNames.length > 0 && discoveredSolutions.length > 0) {
            assembleFinishedPuzzle(discoveredSolutions);
            setCoversLoaded(true);
            console.log(solutionsFound);
        }

        console.log(discoveredSolutions);

        if (discoveredSolutions.length == 4) {
            setPuzzleFinished(true);
        }

    }, [coasterNames, discoveredSolutions, coversLoaded, puzzleFinished])

    const handleItemClick = (name: string) => {
        console.log(name);

        if (selectedItems.includes(name)) {
            setSelectedItems(selectedItems.filter((i) => i !== name));
        }
        else {
            if (selectedItems.length < 4) {
                const newSelection = [...selectedItems, name];
                setSelectedItems(newSelection);

                if (newSelection.length == 4) {
                    return
                }
            }
        }

        console.log(selectedItems);
    }

    const handleSubmit = () => {
        console.log(selectedItems);
        const solution = checkIfGroupCorrect(selectedItems);
        if (solution) {
            setSolutionsFound((prev) => prev + 1);
            animationDriver(selectedItems, solution);
            setSelectedItems([]);
            updatePuzzleStorageState(solution, mistakesRemaining)

            if (solutionsFound == 3) {
                setPuzzleFinished(true);
            }

        }
        else {
            console.log("WRONG ANSWER")
            selectedItems.forEach(name => {
                const button = Array.from(document.querySelectorAll('button'))
                    .find(b => b.textContent?.trim() === name) as HTMLElement | undefined;

                if (button) {
                    button.classList.add('shake');
                    setTimeout(() => button.classList.remove('shake'), 400);
                }
            });

            setTimeout(() => {
                setSelectedItems([]);
                updatePuzzleStorageState(solution, mistakesRemaining - 1);
            }, 400);

            setMistakesRemaining(prev => Math.max(prev - 1, 0));
        }
    }

    const checkIfGroupCorrect = (selected: string[]): ConnectionsSolutionObject | null => {

        let connectionSolution = null;

        connectionSolutions.forEach(solution => {
            if (arraysContainSameElements(solution.name_sequence, selected)) {
                connectionSolution = solution;
            }
        })

        return connectionSolution
    }

    function arraysContainSameElements(a: string[], b: string[]): boolean {
        if (a.length !== b.length) return false;
        const setA = new Set(a);
        const setB = new Set(b);
        return [...setA].every((item) => setB.has(item));
    }

    function removeCommonValues(arr1: any, arr2: any) {
        for (let i = arr1.length - 1; i >= 0; i--) {
            const value = arr1[i];
            const indexInArr2 = arr2.indexOf(value);

            if (indexInArr2 !== -1) {
                arr1.splice(i, 1);
                arr2.splice(indexInArr2, 1);
            }
        }
    }

    function animationDriver(selectedNodes: string[], foundSolution: ConnectionsSolutionObject) {

        const puzzleSelector = document.getElementById("puzzle-parent");
        const solutionNodes: HTMLElement[] = [];
        const solutionPositions = [];
        const swapPositions = [];
        const swapNodes: HTMLElement[] = [];

        if (puzzleSelector) {
            for (var i = 0; i < puzzleSelector?.children.length; i++) {
                const childText = puzzleSelector.children[i].textContent;
                const id = puzzleSelector.children[i].id.split("-")[2]
                if (childText && selectedNodes.includes(childText)) {
                    solutionNodes.push(puzzleSelector.children[i] as HTMLElement)
                    solutionPositions.push(id)
                }

                if (solutionsFound == 0) {
                    if (parseInt(id) < 4) {
                        swapNodes.push(puzzleSelector.children[i] as HTMLElement)
                        swapPositions.push(id)
                    }
                }
                else {
                    const startingPos = solutionsFound * 4;
                    if (parseInt(id) >= startingPos && parseInt(id) <= startingPos + 3 && solutionsFound != 3) {
                        swapNodes.push(puzzleSelector.children[i] as HTMLElement)
                        swapPositions.push(id)
                    }
                }
            }
        }

        if (solutionsFound != 3) {
            removeCommonValues(swapPositions, solutionPositions);
            removeCommonValues(solutionNodes, swapNodes);


            console.log(swapPositions, solutionPositions)
            console.log(swapNodes)
            console.log(solutionNodes)

            if (solutionNodes.length) {
                solutionNodes.forEach((node, index) => {
                    swapAnimation(node, swapNodes[index])
                    swapAnimation(swapNodes[index], node)
                })
            }
        }
        else {
            swapNodes.push(puzzleSelector?.children[12] as HTMLElement);
        }

        //console.log(swapNodes[0].offsetTop)

        //Create Cover Div
        createCoverDiv(foundSolution, swapNodes, puzzleSelector, solutionsFound)

        //Swap HTML Elements
        if (solutionsFound != 3) {
            setTimeout(() => {
                swapNodes.forEach((node, index) => {
                    solutionNodes[index].innerHTML = node.innerHTML
                    node.style.opacity = '0';
                    node.style.minHeight = solutionNodes[index].style.minHeight;
                    document.getElementById(`puzzle-animation-placeholder-${node.id}`)?.remove()
                    document.getElementById(`puzzle-animation-placeholder-${solutionNodes[index].id}`)?.remove()
                    solutionNodes[index].style.opacity = '100'
                })

                if (solutionsFound == 0) {
                    for (var i = 0; i < 4; i++) {
                        const node = document.getElementById(`puzzle-button-${i}`) as HTMLButtonElement;
                        if (node) {
                            node.style.opacity = '0';
                            node.disabled = true;
                        }
                    }
                }
                else {
                    var startingPos = solutionsFound * 4;
                    for (var i = startingPos; i < startingPos + 4; i++) {
                        const node = document.getElementById(`puzzle-button-${i}`) as HTMLButtonElement;
                        if (node) {
                            node.style.opacity = '0';
                            node.disabled = true;
                        }
                    }
                }

                setCoasterNames((prev) => {
                    const updated = [...prev];
                    swapNodes.forEach((node, index) => {
                        const fromIndex = parseInt(solutionNodes[index].id.split("-")[2]);
                        const toIndex = parseInt(node.id.split("-")[2]);
                        [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
                    });
                    return updated;
                });

            }, 2500)
        }

    }

    function swapAnimation(fromNode: HTMLElement, toNode: HTMLElement) {

        if (fromNode && toNode) {
            const fromRect = fromNode.getBoundingClientRect();
            const toRect = toNode.getBoundingClientRect();
            fromNode.style.opacity = '0';

            const xTranslate = toRect.x - fromRect.x;
            const yTranslate = toRect.y - fromRect.y;

            const newElement = document.createElement('div');
            newElement.innerHTML = fromNode.innerHTML;
            newElement.className = 'text-gray-800 font-normal text-sm md:text-xl text-center font-display py-8 px-8 rounded-lg justify-center items-center flex flex-col bg-(--card-foreground)';

            //console.log(fromNode.textContent)
            //console.log(`${fromRect.width}px ${fromRect.height}px`)

            //console.log(toNode.textContent)
            //console.log(`${toRect.width}px ${toRect.height}px`)

            newElement.id = `puzzle-animation-placeholder-${fromNode.id}`
            newElement.style.position = 'absolute';
            newElement.style.left = `${fromRect.left}px`;
            newElement.style.top = `${fromRect.top}px`;
            newElement.style.width = `${toRect.width}px`;
            newElement.style.height = `${toRect.height}px`;
            newElement.style.zIndex = '10';
            newElement.style.transition = 'transform 0.5s ease';

            document.body.appendChild(newElement);

            requestAnimationFrame(() => {
                newElement.style.transform = `translate(${xTranslate}px, ${yTranslate}px)`;
            });

        }
    }

    function createCoverDiv(foundSolution: ConnectionsSolutionObject, swapNodes: HTMLElement[], puzzleSelector: HTMLElement | null, solutionsNumber: number) {

        console.log("CREATING COVER DIV:", solutionsNumber);

        const newElement = document.createElement('div');
        const titleElement = document.createElement('h3');
        titleElement.className = 'text-primary text-3xl text-center font-display';
        titleElement.textContent = foundSolution.connections_object.category;
        newElement.appendChild(titleElement);

        const pElement = document.createElement('p');
        pElement.className = 'text-primary text-lg text-center font-(family-name: --font-body) font-medium';
        pElement.textContent = foundSolution.connections_object.explanation.replace("%replace%", `${foundSolution.connections_object.value}`);
        newElement.appendChild(pElement);

        const namesElement = document.createElement('p');
        namesElement.className = 'text-primary text-lg text-center font-(family-name: --font-body) font-semibold';
        namesElement.textContent = `${foundSolution.name_sequence.join(", ")}`;
        newElement.appendChild(namesElement);

        newElement.className = `pop-anim text-gray-800 text-center py-8 px-8 rounded-lg justify-center items-center flex flex-col w-full opacity-100`;
        newElement.style.position = 'absolute';
        newElement.style.left = `0px`;
        newElement.style.top = `${swapNodes[0].offsetTop}px`;
        newElement.style.height = `${swapNodes[0].getBoundingClientRect().height}px`
        newElement.style.zIndex = '1000';
        newElement.style.backgroundColor = `var(${solutionsNumber == 0 ? '--connection-solution-one' : solutionsNumber == 1 ? '--connection-solution-two' : solutionsNumber == 2 ? '--connection-solution-three' : '--connection-solution-four'})`

        console.log(newElement);

        setTimeout(() => {
            puzzleSelector?.appendChild(newElement);
        }, 500)
    }

    async function updatePuzzleStorageState(solution: ConnectionsSolutionObject | null, mistakesMade: number,) {

        const today = new Date().toLocaleDateString('en-CA');
        let prevPuzzleState = await localStorage.getItem('coasterPuzzleState');
        let solutionsSolved: ConnectionsSolutionObject[] = [];

        if (prevPuzzleState) {
            try {
                const parsed = JSON.parse(prevPuzzleState);

                if (parsed.date === today) {
                    solutionsSolved = [...parsed.solutionsSolved];
                }
            }
            catch (err) {
                console.warn('Failed to parse stored puzzle state: ', err);
            }
        }

        if (!solutionsSolved.some(s => JSON.stringify(s) == JSON.stringify(solution)) && solution) {
            solutionsSolved.push(solution);
        }

        const gameState: GameStateInterface = {
            date: today,
            solutionsSolved,
            coasterNames,
            connectionSolutions,
            mistakesRemaining: mistakesMade,
            revealHint1,
            revealHint2,
            revealHint3
        }

        localStorage.setItem("coasterPuzzleState", JSON.stringify(gameState))
    }

    function sortCoasterNames(solutions: ConnectionsSolutionObject[], currCoasterNames: CoasterPuzzleObject[]) {
        let subCoasterNames: string[] = [];

        solutions.forEach(solution => {
            subCoasterNames.push(...solution.name_sequence);
        })

        currCoasterNames.sort((a, b) => {
            const aIndex = subCoasterNames.indexOf(a.name);
            const bIndex = subCoasterNames.indexOf(b.name);

            if (aIndex === -1 && bIndex == -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;

            return aIndex - bIndex;
        })

        return currCoasterNames
    }

    async function assembleFinishedPuzzle(solutions: ConnectionsSolutionObject[]) {
        const puzzleSelector = document.getElementById("puzzle-parent");
        const swapNodes: HTMLElement[] = []

        for (var i = 0; i < solutions.length; i++) {
            swapNodes.pop();
            if (puzzleSelector) {
                swapNodes.push(puzzleSelector.children[i * 4] as HTMLElement);
                createCoverDiv(solutions[i], swapNodes, puzzleSelector, i)
            }
            else {
                console.log("PUZZLE SELECTOR NULL")
            }
        }
    }

    function getRemainingHints(): ConnectionsSolutionObject[] {
        return connectionSolutions.slice(solutionsFound);
    }

    function countHintsUsed(): number {
        let usedHints = 0;

        for (var i = 0; i < 3; i++) {
            if ([revealHint1, revealHint2, revealHint3][i]) {
                usedHints++;
            }
        }

        return usedHints
    }


    return (
        <div
            className={`flex flex-col  justify-center md:space-y-8 space-y-2 transition-opacity duration-500 ${fadeInGameProp ? 'opacity-100' : 'opacity-0'
                } md:px-8 px-4 max-w-7xl`}
        >
            <p className="mb-6 font-medium text-lg text-(--button-primary) self-center">Create four groups of four!</p>
            <div id="puzzle-parent" className="grid grid-cols-4 gap-4 justify-center items-center relative transition-all duration-2000">

                {coasterNames.map((coaster_object, index) => (
                    <button
                        key={index}
                        id={`puzzle-button-${index}`}
                        onClick={() => handleItemClick(coaster_object.name)}
                        className={`${selectedItems.includes(coaster_object.name) ? 'bg-(--card-selected)' : 'bg-(--card-foreground)'}
    text-gray-800 font-normal text-sm md:text-xl text-center font-display 
    py-8 px-2 rounded-lg hover:bg-(--card-hover) transition-colors duration-500
    cursor-pointer justify-center items-center flex flex-col h-24 md:h-48`}
                    >
                        <img className="md:w-32 md:h-24 w-20 h-12 object-cover mb-2 rounded-sm" src={coaster_object.imageURL} />
                        <p style={{ fontSize: 'clamp(0.35rem, 2vw, 1rem)' }} className="max-w-3/4 text-center leading-tight">{coaster_object.name}</p>
                    </button>


                ))}
            </div>
            <div className="flex flex-col gap-4 relative">
                <div className={`flex flex-row gap-4 w-full justify-evenly items-center absolute bg-(--background) h-full ${puzzleFinished ? 'z-15' : '-z-1'} ${puzzleFinished ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                    <div className="flex flex-col items-center justify-center gap-2">
                        <h3 className='font-(family-name: --font-body) font-semibold text-2xl'>Mistakes Made:</h3>
                        <p className='font-display font-normal text-8xl ml-4 align-baseline'>{5 - mistakesRemaining}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2">
                        <h3 className='font-(family-name: --font-body) font-semibold text-2xl'>Hints Used:</h3>
                        <p className='font-display font-normal text-8xl ml-4 align-baseline'>{countHintsUsed()}</p>
                    </div>
                </div>
                <div className="flex md:flex-col flex-row gap-4 w-full justify-between">
                    <div className="flex flex-row items-center justify-between self-center ">
                        <p className="text-sm md:text-lg font-medium pe-4 text-primary">Mistakes Remaining:</p>
                        {Array.from({ length: mistakesRemaining }).map((_, index) => (
                            <div key={index} className="rounded-full md:w-4 w-2 md:h-4 h-2 bg-(--button-primary) mx-1"></div>
                        ))}
                    </div>
                    <Button disabled={selectedItems.length != 4} onClick={() => handleSubmit()}> Submit </Button>
                </div>
                <div className="flex flex-row gap-2 md:mt-4 md:gap-4 min-h-24">
                    {getRemainingHints().slice(0, 3).map((solution, index) => (
                        <div key={index} className="flex flex-col w-full justify-center items-center gap-2 md:gap-4">

                            <p className={`text-sm md:text-xl text-primary font-medium font-display ${[revealHint1, revealHint2, revealHint3][index] ? 'opacity-100' : 'opacity-0'} transition-all duration-200`}>
                                {solution.connections_object.category}
                            </p>

                            <Button
                                onClick={() => {
                                    if (index === 0) setRevealHint1(true);
                                    if (index === 1) setRevealHint2(true);
                                    if (index === 2) setRevealHint3(true);
                                }}
                                disabled={mistakesRemaining >= (4 - index) || [revealHint1, revealHint2, revealHint3][index]}
                            >
                                Reveal Hint
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}
