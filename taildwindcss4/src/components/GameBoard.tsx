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

const fetchTodaysPuzzle = async (): Promise<Puzzle | null> => {
    try {

        //const docId = `${new Date().toISOString().replace(/[:.//]/g, '-').split('T')[0]}`
        const docId = "2025-05-15"
        console.log("Attempting to fetch puzzle with ID: ", docId);

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

    const [loaded, setLoaded] = useState(false);
    const [mistakesRemaining, setMistakesRemaining] = useState<number>(5);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [solutionsFound, setSolutionsFound] = useState<number>(0);
    const [coasterNames, setCoasterNames] = useState<CoasterPuzzleObject[]>([]);
    const [connectionSolutions, setConnectionSolutions] = useState<ConnectionsSolutionObject[]>([])
    const [revealHint1, setRevealHint1] = useState<boolean>(false);
    const [revealHint2, setRevealHint2] = useState<boolean>(false);
    const [revealHint3, setRevealHint3] = useState<boolean>(false);

    useEffect(() => {

        const fetchData = async () => {
            const puzzle = await fetchTodaysPuzzle();
            if (puzzle) {
                const shuffledNames = [...puzzle.coaster_objects].sort(() => 0.5 - Math.random())
                setCoasterNames(shuffledNames);
                setConnectionSolutions(puzzle?.correct_connections);
                setLoaded(true);
            }
        }

        fetchData();

    }, [])

    const handleItemClick = (name: string) => {

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

        //console.log(selectedItems);
    }

    const handleSubmit = () => {
        const solution = checkIfGroupCorrect(selectedItems);
        if (solution) {
            setSolutionsFound((prev) => prev + 1);
            animationDriver(selectedItems, solution);
            setSelectedItems([]);
        }
        else {
            setMistakesRemaining((prev) => Math.max(prev - 1, 0));
            setSelectedItems([]);
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

                if(solutionsFound == 1){
                    if (parseInt(id) > 3 && parseInt(id) < 8) {
                        swapNodes.push(puzzleSelector.children[i] as HTMLElement)
                        swapPositions.push(id)
                    }
                }
            }
        }

        removeCommonValues(swapPositions, solutionPositions);
        removeCommonValues(solutionNodes, swapNodes);

        console.log(swapPositions, solutionPositions)
        console.log(swapNodes)
        console.log(solutionNodes)

        solutionNodes.forEach((node, index) => {
            swapAnimation(node, swapNodes[index])
            swapAnimation(swapNodes[index], node)
        })

        //console.log(swapNodes[0].offsetTop)

        const newElement = document.createElement('div');
        const titleElement = document.createElement('h3');
        titleElement.className = 'text-primary text-xl text-center font-display';
        titleElement.textContent = foundSolution.connections_object.category;
        newElement.appendChild(titleElement);
        const pElement = document.createElement('p');
        pElement.className = 'text-primary text-lg text-center font-(--font-body) font-medium';
        pElement.textContent = foundSolution.connections_object.explanation.replace("%replace%", `${foundSolution.connections_object.value}`);
        newElement.appendChild(pElement);
        newElement.className = 'text-gray-800 text-center py-8 px-8 rounded-lg justify-center items-center flex flex-col bg-(--connection-solution-one) w-full opacity-0';

        newElement.style.position = 'absolute';
        newElement.style.left = `0px`;
        newElement.style.top = `${swapNodes[0].offsetTop}px`;
        newElement.style.minHeight = `${swapNodes[0].getBoundingClientRect().height}px`
        newElement.style.zIndex = '1000';
        newElement.style.transition = 'opacity 0.5s ease';

        puzzleSelector?.appendChild(newElement);

        setTimeout(() => {
            newElement.style.opacity = '100';
        }, 750)

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

            newElement.style.position = 'absolute';
            newElement.style.left = `${fromRect.left}px`;
            newElement.style.top = `${fromRect.top}px`;
            newElement.style.width = `${fromRect.width}px`;
            newElement.style.height = `${fromRect.height}px`;
            newElement.style.zIndex = '10';
            newElement.style.transition = 'transform 0.5s ease';

            document.body.appendChild(newElement);

            requestAnimationFrame(() => {
                newElement.style.transform = `translate(${xTranslate}px, ${yTranslate}px)`;
            });

        }
    }

    return (
        <div
            className={`flex flex-col  justify-center space-y-8 transition-opacit duration-500 ${fadeInGameProp ? 'opacity-100' : 'opacity-0'
                } px-8`}
        >
            <p className="mb-6 font-medium text-lg text-(--button-primary) self-center">Create four groups of four!</p>
            <div id="puzzle-parent" className="grid grid-cols-4 gap-4 justify-center relative">
                {coasterNames.map((coaster_object, index) => (
                    <button
                        key={index}
                        id={`puzzle-button-${index}`}
                        onClick={() => handleItemClick(coaster_object.name)}
                        className={`${selectedItems.includes(coaster_object.name) ? 'bg-(--card-selected)' : 'bg-(--card-foreground)'
                            } text-gray-800 font-normal text-sm md:text-xl text-center font-display py-8 px-8 rounded-lg hover:bg-(--card-hover) transition-colors duration-500 cursor-pointer justify-center items-center flex flex-col`}
                    >
                        <img className="w-32 h-24 object-cover mb-2 rounded-sm" src={coaster_object.imageURL} />
                        {coaster_object.name}
                    </button>
                ))}
            </div>
            <div className="flex flex-row items-center justify-between self-center">
                <p className="text-lg font-medium pe-4 text-primary">Mistakes Remaining:</p>
                {Array.from({ length: mistakesRemaining }).map((_, index) => (
                    <div key={index} className="rounded-full w-4 h-4 bg-(--button-primary) mx-1"></div>
                ))}
            </div>
            <Button disabled={selectedItems.length != 4} onClick={() => handleSubmit()}> Submit </Button>
            <div className="flex flex-col gap-4">
                <div className="flex flex-row w-full justify-between">
                    <h3 className="text-primary font-medium">Connection Category Hint #1</h3>

                    {loaded && <p className={` text-lg text-primary font-bold ${revealHint1 ? 'opacity-100' : 'opacity-0'} transition-all duration-200`}>{connectionSolutions[0].connections_object.category}</p>}

                    <Button onClick={() => { setRevealHint1(true) }} disabled={mistakesRemaining >= 4}>Reveal</Button>

                </div>

                <div className="flex flex-row w-full justify-between">
                    <h3 className="text-primary font-medium">Connection Category Hint #2</h3>

                    {loaded && <p className={` text-lg text-primary font-bold ${revealHint2 ? 'opacity-100' : 'opacity-0'} transition-all duration-200`}>{connectionSolutions[1].connections_object.category}</p>}

                    <Button onClick={() => { setRevealHint2(true) }} disabled={mistakesRemaining >= 3}>Reveal</Button>

                </div>

                <div className="flex flex-row w-full justify-between">
                    <h3 className="text-primary font-medium">Connection Category Hint #2</h3>

                    {loaded && <p className={` text-lg text-primary font-bold ${revealHint3 ? 'opacity-100' : 'opacity-0'} transition-all duration-200`}>{connectionSolutions[3].connections_object.category}</p>}

                    <Button onClick={() => { setRevealHint3(true) }} disabled={mistakesRemaining >= 2}>Reveal</Button>

                </div>

                {/*<Button onClick={() => { testFunction(document.getElementById("puzzle-button-1"),document.getElementById("puzzle-button-6")); testFunction(document.getElementById("puzzle-button-6"),document.getElementById("puzzle-button-1")) }}>Test</Button>*/}
                {/*<Button onClick={() => { animationDriver(["Top Thrill Dragster", "Leviathan", "Thunderhead", "Gold Striker"]) }}>Test</Button>*/}

            </div>
        </div>
    )
}
