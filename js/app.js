/* ****** Slot Game JS by Zino Adidi ****** */
/*  Derivco recruitment test solution 2020  */

import * as util from './controllers/Util.js';
import {reels} from "./models/Reel.js";
import {config} from "./config.js";
import {checkCombination, WinningCombinationList} from "./models/WinningCombination.js";

let activeReels = [];
let numOfSpinningReels = 0;
let spinInProgress = false;
let spinStartTime = new Date();

const spin_btn = document.querySelector("#spin_btn");

// create data binding for UI
let reelsContainer =  new Vue({
    el: '#reel-container',
    data: {
        reelArray: [...reels]
    }
});

// bind pay table data
let payTableData = new Vue({
    el: '#pay-table',
    data: {
        balance: config.initialBalance,
        winningCombination: [...WinningCombinationList]
    },
    methods: {
        enforceBalanceLimit: util.enforceBalanceLimit
    }
});

// bind fix mode form
let fixModeData = new Vue({
    el: '#fix_mode_form',
    data: {
        // each item represent reels from 0 - 2
        configuration: [
            {symbol: "CHERRY", position: "1"},
            {symbol: "CHERRY", position: "1"},
            {symbol: "CHERRY", position: "2"}
        ]
    }
});

function handleSpinRequest() {

    if(payTableData.balance <= 0){
        alert("your balance is too low");
        return false;
    }

    // disable interaction
    util.toggleUserInteraction();
    util.scrollReelContainerToPosition(1);
    resetGameArea();

    // deduct users balance
    updateBalance(1, "subtract");

    spinInProgress = true;
    spinStartTime = new Date();

    /*loop through reel array and trigger spin requests for each reel it contains*/
    reelsContainer.reelArray.forEach(function(reel, reelId){
        numOfSpinningReels ++;
        createSpinReel(reel, reelId);
    });
}

function createSpinReel(reelArray, reelId){
    generateReelStopTime(reelId);
    // trigger spin reel
    setTimeout(
        spinReel,
        config.spinSpeed,
        reelId
    )
}

function generateReelStopTime(reelId) {
    if(activeReels[reelId]){
        // stop time already exist for this reel
    }else{
        /* example spin time for reel 1 will be 2000 + (500 * 1) based on requirement document */
        let reelStopTime = config.spinTime + (config.intervalBetweenReels * numOfSpinningReels);
        activeReels[reelId] =  {
            reelStopTime:reelStopTime
        };
    }
}

function spinReel(reelId){
    /* rearrange content of array
    * since the UI is binded to array data, once array is updated,
    * it triggers re-render on the UI meaning there is no separate render function for UI
    * TODO: find a more efficient way to render reels; Possible solution direct sorting of DOM
    *
     */
    let reelArray = reelsContainer.reelArray[reelId];
    let lastItemInReel = reelArray.pop();
    reelArray.unshift(lastItemInReel);

    //update reel object with and UI
    reelsContainer.reelArray[reelId] = reelArray;

    if(getTimeSpentSpinning() < getReelStopTime(reelId)){
        /// continue to spin reel if its not time to stop reel
        createSpinReel(reelArray, reelId);
    }else{
        /*
            checks if game is in fix mode and continues to spin
            until all symbols specified in debug mode are shown
            check is made here to reduce computing time to 1 call per reel.
        */
        if(fixModeConditionsAreMet(reelArray, reelId)){
            // final spin: reduce counter and scroll reel to center
            numOfSpinningReels --;
        }else{
            createSpinReel(reelArray, reelId);
        }
        // check if the last reel has stopped spinning and end game
        if(isLastReel()){
            spinCompletedForAllReels();
        }
    }
}

function getTimeSpentSpinning() {
    return new Date() - spinStartTime;
}

function getReelStopTime(reelId) {
    return activeReels[reelId]['reelStopTime'];
}

// manages debug mode and compares reel data to debug data
function fixModeConditionsAreMet(reelArray, reelId) {
    let reelMeetsDebugCondition = true;

    if(config.gameMode.toLowerCase() === 'fixed'){
        let configuration = fixModeData.configuration[reelId];
        let symbolToCompare = reelArray[configuration.position].name;
        reelMeetsDebugCondition = configuration.symbol === symbolToCompare;
    }

    return reelMeetsDebugCondition;
}

function isLastReel(){
    return numOfSpinningReels <= 0;
}

function spinCompletedForAllReels() {
    calculateScore();
    util.toggleUserInteraction();
}

function calculateScore() {
    let reel1 = [...reelsContainer.reelArray[0]];
    let reel2 = [...reelsContainer.reelArray[1]];
    let reel3 = [...reelsContainer.reelArray[2]];
    let combinationCheckResult = {};

    for(let index = 0; index < 3; index ++){
        let firstItem = reel1[index].name;
        let secondItem = reel2[index].name;
        let thirdItem = reel3[index].name;

        combinationCheckResult = checkCombination(firstItem, secondItem, thirdItem);

        if(combinationCheckResult.isWinningCombination){
            updateBalance(combinationCheckResult.score,"add");
            showWiningAnimation(combinationCheckResult.index, index);
            break;
        }
    }
}

function resetGameArea(){
    spinInProgress = false;
    numOfSpinningReels = 0;
    activeReels = [];
    spinStartTime = new Date();
    // ensure that reel remains in center
    util.scrollReelContainerToPosition(1);
    $(".win-line").hide();
}

function updateBalance(value, updateType){
    if(updateType === "add"){
        payTableData.balance += parseInt(value);
    }else{
        payTableData.balance -= parseInt(value);
    }
}

function showWiningAnimation(combinationId, winningLineOnReel){
    let possiblePositions = [60, 124, 210];
    /// add blinking text to pay table entry
    $("#WinningCombination"+combinationId).toggleClass('blink');
    let winLine =  $(".win-line");

    //// remove blink after x seconds
    setTimeout(function () {
        $("#WinningCombination"+combinationId).removeClass('blink');
        $(".win-line").hide();
    }, 3000);

    let positionToShowLine = possiblePositions[winningLineOnReel] + $("#reel-container").position().top;
    // show winning line //
    winLine.css({
        top: positionToShowLine,
        width: $("#reel-container").width()
    });
    winLine.show();

    // scroll reel to winning position
    util.scrollReelContainerToPosition(winningLineOnReel);

}

// wait for all images and dom to be ready
$( window ).on( "load", function () {
    /* setup game area */
    spin_btn.addEventListener("click",function(){handleSpinRequest()});
    util.setupGameArea();
    /* hide loading screen */
    setTimeout(util.stopLoad, 2000);
} );
