# RadoSolver for Minesweeper Online

RadoSolver is an automated, real-time JavaScript solver bookmarklet built specifically for [Minesweeper Online](https://minesweeperonline.com/). 

It relies on a mathematical constraint approach known as the Double-Set Single-Point (DSSP) algorithm. By cross-referencing overlapping sets of hidden boundaries and generating recursive "virtual bounds," the solver systematically deduces complex topological patterns—such as 1-2-1 edge corners—virtually eliminating the need for blind guesses until a mathematical deadlock is absolute.

## How to Install and Use

1. **Create the Bookmarklet**
   Create a new bookmark in your browser (e.g., right-click your bookmarks bar and select "Add Page"). Name it `RadoSolver`.
2. **Add the Script** 
   Copy and paste the exact code snippet below directly into the **URL** field of your new bookmark, then save it:
   ```text
   javascript:(function()%7Bvar%20t%3Dnew%20Date().getTime()%3Bvar%20a%3Ddocument.createElement(%22script%22)%3Ba.src%3D%22https%3A%2F%2Fconradonegro.github.io%2Fminesweeper_solver%2Fms_cn.js%3Fv%3D%22%2Bt%3Bdocument.getElementsByTagName(%22head%22)%5B0%5D.appendChild(a)%3Bvar%20b%3Ddocument.createElement(%22link%22)%3Bb.rel%3D%22stylesheet%22%3Bb.href%3D%22https%3A%2F%2Fconradonegro.github.io%2Fminesweeper_solver%2Fstyle.css%3Fv%3D%22%2Bt%3Bdocument.getElementsByTagName(%22head%22)%5B0%5D.appendChild(b)%3B%7D)()%3B
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
