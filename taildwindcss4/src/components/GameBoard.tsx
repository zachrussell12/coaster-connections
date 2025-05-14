import { useState } from "react";
import Button from "./Button";

interface GameProps{
    fadeInGameProp: boolean,
}

export default function GameBoard( {fadeInGameProp}: GameProps ) {

    const [mistakesRemaining, setMistakesRemaining] = useState<number>(4);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    let cols = 4
    let rows = 4

    const handleItemClick = (index: number) => {

        if (selectedItems.includes(index)) {
            setSelectedItems(selectedItems.filter((i) => i !== index));
        }
        else {
            if (selectedItems.length < 4) {
                const newSelection = [...selectedItems, index];
                setSelectedItems(newSelection);

                if (newSelection.length == 4) {
                    return
                }
            }
        }
    }

    const handleSubmit = () => {
        const isCorrectGroup = checkIfGroupCorrect(selectedItems);
        if (isCorrectGroup) {
            alert("Correct!");
            setSelectedItems([]);
        }
        else {
            alert("Wrong!");
            setMistakesRemaining((prev) => Math.max(prev - 1, 0));
            setSelectedItems([]);
        }
    }

    const checkIfGroupCorrect = (selected: number[]): boolean => {
        return selected.every((item) => item % 2 === 0);
    }

    return (
            <div
                className={`flex flex-col  justify-center space-y-8 transition-opacit duration-500 ${fadeInGameProp ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <p className="mb-6 font-medium text-lg text-(--button-primary) self-center">Create four groups of four!</p>
                <div className="grid grid-cols-4 gap-4 justify-center">
                    {Array.from({ length: rows * cols }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => handleItemClick(index)}
                            className={`${selectedItems.includes(index) ? 'bg-(--card-selected)' : 'bg-(--card-foreground)'
                                } text-gray-800 font-normal text-xl font-display py-8 px-8 rounded hover:bg-teal-100 transition-all duration-200 cursor-pointer`}
                        >
                            Item {index + 1}
                        </button>
                    ))}
                </div>
                <div className="flex flex-row items-center justify-between self-center">
                    <p className="font-normal pe-4 text-primary">Mistakes Remaining:</p>
                    {Array.from({ length: mistakesRemaining }).map((_, index) => (
                        <div key={index} className="rounded-full w-4 h-4 bg-(--button-primary) mx-1"></div>
                    ))}
                </div>
                <Button disabled={selectedItems.length != 4} onClick={() => handleSubmit()}> Submit </Button>
                <div>
                    <div className="flex flex-row w-full justify-between"> 
                        <h3>Group Commonality #1</h3> 

                        <button>Reveal</button>
                        
                    </div>
                    
                </div>
            </div>
    )
}
