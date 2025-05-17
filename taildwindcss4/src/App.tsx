import { useEffect, useState } from 'react'
import './App.css'
import logo from './assets/images/coasterconnections_logo.webp'
import GameBoard from './components/GameBoard';
import Button from './components/Button';

function App() {

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [fadeInGame, setFadeInGame] = useState<boolean>(false);
  const [continueGame, setContinueGame] = useState<boolean>(false);
  const [gameComplete, setGameComplete] = useState<boolean>(false);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const puzzleState = localStorage.getItem("coasterPuzzleState");

    if(puzzleState){
      const parsedState = JSON.parse(puzzleState);

      if(parsedState.date === today){
        if(parsedState.solutionsSolved.length > 0 && parsedState.solutionsSolved.length < 3){
          setContinueGame(true);
        }
        else if(parsedState.solutionsSolved.length == 4){
          setGameComplete(true);
        }
      }
    }

  }, [])

  return (
    <>
      <main className="h-screen flex items-center justify-center relative bg-(--background)">
        <p className="absolute top-0 right-0 p-4">Made for mimi 💚</p>

        {!gameStarted && (
          <div
            className={`px-4 md:px-8 py-8 max-w-6xl mx-auto text-center transition-opacity duration-500 ${showSplash ? 'fade-in-slide' : 'fade-out-slide'
              }`}
          >
            <img className="w-16 h-16 mx-auto mb-8" src={logo} alt="Coaster Connections Logo" />
            <h1 className="text-3xl mb-2 font-display font-normal -skew-x-6 text-(--primary)">
              Coaster Connections
            </h1>
            <p className="mb-4 font-medium text-(--button-primary)">
              Group coasters together that share commonalities.
            </p>

            <Button
              onClick={() => {
                setShowSplash(false);
                setTimeout(() => {
                  setGameStarted(true);
                  setTimeout(() => {
                    setFadeInGame(true);
                  }, 500)
                }, 500);
              }}
            >
              {continueGame ? 'Continue' : gameComplete ? 'Review Solution' : 'Play'}
            </Button>
            <p className="mt-4 text-gray-600">{new Date().toDateString()}</p>
          </div>
        )}


        {gameStarted && (
          <GameBoard fadeInGameProp={fadeInGame}/>
        )}
      </main >
    </>
  );
}

export default App
