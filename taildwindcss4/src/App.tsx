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
    const puzzleState = localStorage.getItem("coasterPuzzleState");

    if (puzzleState) {
      const parsedState = JSON.parse(puzzleState);
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');

      const isBefore8AM = today.getHours() < 8;

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      if (parsedState.date === todayStr || (parsedState.date === yesterdayStr && isBefore8AM)) {
        if (parsedState.solutionsSolved.length > 0 && parsedState.solutionsSolved.length < 3) {
          setContinueGame(true);
        }
        else if (parsedState.solutionsSolved.length == 4) {
          setGameComplete(true);
        }
      }
    }

  }, [])

  return (
    <>
      <main className="h-screen flex items-center justify-center relative bg-(--background)">
        <p className="absolute top-0 right-0 p-4">Made for mimi 💚</p>

        <div className="absolute top-0 left-0 p-4">
          <a href="https://github.com/zachrussell12/coaster-connections" target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06ZM11.377 2.011a.75.75 0 0 1 .612.867l-2.5 14.5a.75.75 0 0 1-1.478-.255l2.5-14.5a.75.75 0 0 1 .866-.612Z" clipRule="evenodd" />
            </svg>
          </a>
        </div>


        {!gameStarted && (
          <div
            className={`px-4 md:px-8 py-8 max-w-6xl mx-auto text-center transition-opacity duration-500 ${showSplash ? 'fade-in-slide' : 'fade-out-slide'
              }`}
          >
            <img className="w-16 h-16 mx-auto mb-8" src={logo} alt="Coaster Connections Logo" />
            <h1 className="text-xl md:text-3xl mb-2 font-display font-normal -skew-x-6 text-(--primary)">
              Coaster Connections
            </h1>
            <p className="mb-4 font-medium text-(--button-primary) text-base md:text-lg">
              Group coasters together that share common characteristics.
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
            <p className="mt-4 text-gray-600 text-sm md:text-base">{new Date().toDateString()}</p>
          </div>
        )}


        {gameStarted && (
          <GameBoard fadeInGameProp={fadeInGame} />
        )}

        <p className={`absolute font-(family-name: --font-body) text-gray-400 text-xs bottom-0 pb-4 md:hidden transition-opacity duration-300 ${gameStarted ? 'opacity-0' : 'opacity-100'}`}>For the best experience, visit on desktop.</p>
      </main >
    </>
  );
}

export default App
