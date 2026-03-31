# RadoSolver for Minesweeper Online

RadoSolver is an automated, real-time JavaScript solver bookmarklet built specifically for [Minesweeper Online](https://minesweeperonline.com/). 

It relies on a mathematical constraint approach known as the Double-Set Single-Point (DSSP) algorithm. By cross-referencing overlapping sets of hidden boundaries and generating recursive "virtual bounds," the solver systematically deduces complex topological patterns—such as 1-2-1 edge corners—virtually eliminating the need for blind guesses until a mathematical deadlock is absolute.

## How to Install and Use

1. **Create the Bookmarklet**
   Create a new bookmark in your browser (e.g., right-click your bookmarks bar and select "Add Page"). Name it `RadoSolver`.
2. **Add the Script** 
   Copy and paste the exact code snippet below directly into the **URL** field of your new bookmark, then save it:
   ```text
   javascript:(function(){var t=new Date().getTime();var a=document.createElement("script");a.src="https://conradonegro.github.io/minesweeper_solver/ms_cn.js?v="+t;document.getElementsByTagName("head")[0].appendChild(a);var b=document.createElement("link");b.rel="stylesheet";b.href="https://conradonegro.github.io/minesweeper_solver/style.css?v="+t;document.getElementsByTagName("head")[0].appendChild(b);})();
   ```
3. **Play the Game**
   - Navigate to [Minesweeper Online](https://minesweeperonline.com/).
   - Click the `RadoSolver` bookmark in your bookmarks bar.
   - A new control panel will appear directly on the website.
   - Adjust your preferred Simulation Speed (Yield Delay), First Move strategy, and Deadlock Fallbacks in the UI config panel.
   - Click the **RadoSolver** button and watch the automation sweep the board!

## Features
- **Real-Time Rendering:** Watch the solver physically click and map mines.
- **Manual Overrides:** Optionally configure the algorithm to pause exactly at deadlocks and await human clicks to continue execution.
- **Auto-Restart:** Automatically re-rolls the game upon hitting a forced-guess mine.
