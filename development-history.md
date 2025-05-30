# May 14th, 2025

- **Decision 1:** Created new React + TailwindCSS project using Vite
- **Decision 2:** Created landing splash and triggering of game start
- **Decision 3:** Created board game with placeholder information and set up selection mechanics
- **Decision 4:** Created Firebase backend function syncCoasterData to keep coaster database up to date
- **Decision 5:** Started to work on hints the player will be able to reveal as they play

# May 15th, 2025

- **Decision 1:** Tweaked backend coaster sync to better handle data from API and include new data for storage.
- **Decision 2:** Created puzzle creation cloud function that creates a function everyday at [TIME_NOT_SET].
- **Decision 3:** Created puzzleConstants in order to generate 4 connections for each day to create a valid puzzle.
- **Decision 4:** Updated GameBoard component to use the daily puzzle from the database instead of placeholder values.
- **Decision 5:** Updated various functions to handle real data from the backend to make the game work properly.
- **Decision 6:** Began working on animation that is played when a user gets a connection group correct.
- **Decision 7:** Fixed syntax on this file and changed the filename.

# May 16th, 2025

- **Decision 1:** Finished animation for when a player makes a connection.
- **Decision 2:** Set up localStorage so player can resume where they left off or revisit a puzzle they already solved.
- **Decision 3:** Added a "summary" type of overlay at the bottom for when the puzzle is solved.
- **Decision 4:** Adjusted button text on landing to reflect the state of the puzzle (not started, partially finished, and compelted).

# May 17th, 2025

- **Decision 1:** Adjusted puzzle object coaster_objects field sent from the backend to contain all stats related to the specific coaster now.
- **Decision 2:** Cleaned up mobile responsiveness of site and made it playable on mobile, but recommended user plays on desktop.
- **Decision 3:** Adjusted puzzle fetching so it checks the time and adjusts the fetch according to so.
- **Decision 4:** Added basic error handling for a failed fetch. Will add more robust handling later.
- **Decision 5:** Updated backend functions to execute at their set times now sync at 3am every month and puzzle at 8am everyday. 
- **Decision 6:** Added handling so that a solution that is already in the row that it needs to be does not execute any swap and just gets a div placed over it.
- **Decision 7:** Updated vite.config.ts to include build directory

# May 17th, 2025 (Later)

- **Decision 1:** Added meta tags for link sharing previews.
- **Decision 2:** Fixed small styling issue on mobile.
- **Decision 3:** Added link to repository in the top left.
- **Decision 4:** Added README to base of repo.
- **Decision 5:** Removed README from frontend folder.

# May 17th, 2025 (Even Later)

- **Decision 1:** Added the losing animation because I completely forgot it.
- **Decision 2:** Updated discoveredSolutions state when the player finds a solution because I forgot it.
- **Decision 3:** Added You Win! or You Lose! text upon the game finishing.

# May 18th, 2025

- **Decision 1:** Changed backend to generate puzzle at 6am instead of 8am.
- **Decision 2:** Changed frontend logic to check if its before 6am instead of 8am.

# May 19th, 2025

- **Decision 1:** Updated backend logic to omit any overlap of the categories. Too much overlap made it impossible to determine what the correct sequence of many different possible combinations was.
- **Decision 2:** Tied specific colors to each connection category
- **Decision 3:** Added a copyable result after the game is over so players can share their results, what order the solved the puzzle in, and other details
- **Decision 4:** Fixed a bug where the order of the connections the player found wasnt being preserved and was being overwritten

# May 21st, 2025

- **Decision 1:** Fixed error in backend puzzle creation logic causing it to find no viable coasters for a category even on the first category.

# May 30th, 2025

- **Decision 1:** Fixed the path issue causing the link preview images to not show up. Vite uses different pathing than the vanilla Create React App used to use.