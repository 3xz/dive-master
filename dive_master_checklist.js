/**
 * Setup checkbox to save newly completed dives to browser storage.
 *
 * @return HTML to put in <th>
 */

function setUnfinishedDive(diveID) {
    //var diveLink = document.createElement('a');
    return '';
}

/**
 * Modify wiki page to add checklist framework
 */

function modifyWiki() {
    // Add unique id to table after publishing addon?
    var locationTable = document.getElementsByTagName('table')[1];
    var tableRows     = locationTable.getElementsByTagName('tr');

    var currentRegion;
    var diveLocation = 1;

    // Set table header
    tableRows[0].innerHTML = '<th>&#x2713;</th>' + tableRows[0].innerHTML;

    for (var i = 1; i < tableRows.length; i++) {
        var thRow = tableRows[i].getElementsByTagName('th');

        if (thRow.length == 1) {
            currentRegion = thRow[0].textContent.trim();
            diveLocation  = 1;

            thRow[0].setAttribute('colspan','5');
        } else {
            if (currentRegion === undefined) {
                continue;
            }

            var checklistString = '';

            tableRows[i].innerHTML = '<td data-dive-region="' + currentRegion + '" data-dive-location-id="' + diveLocation + '">' + checklistString + '</td>' + tableRows[i].innerHTML;

            diveLocation++;
        }
    }
}

/**
 * Updates the checklist when new data is available
 */

function updateWiki(diveMaster) {
    var locationTable = document.getElementsByTagName('table')[1];
    var tableRows     = locationTable.getElementsByTagName('tr');

    for (var i = 0; i < tableRows.length; i++) {
        // Table headers don't have regions/data attributes
        if (tableRows[i].getElementsByTagName('th').length >= 1) {
            continue;
        }

        var currentRegion = tableRows[i].firstChild.dataset.diveRegion;
        var diveLocation  = tableRows[i].firstChild.dataset.diveLocationId;

        var checklistString = '';

        if (diveMaster[currentRegion][diveLocation].completed) {
            checklistString = '&#x2713';
        } else {
            checklistString = setUnfinishedDive(diveMaster[currentRegion][diveLocation].id);
        }

        tableRows[i].firstChild.innerHTML = checklistString;
    }
}

/**
 * Load API key from storage, call function to load achievement data, and add
 * achievement checklist framework to wiki
 */

function setup() {
    var PLAYER_API_KEY     = '';
    var DIVE_MASTER_ACH_ID = 335;

    chrome.storage.local.get('api_key', (res) => {
       PLAYER_API_KEY = res.api_key;

       loadAchievementData(PLAYER_API_KEY, DIVE_MASTER_ACH_ID);
    });

    modifyWiki();
}

/**
 * Begins loading achievement data from the API. Calls function to update wiki page.
 */

function loadAchievementData(PLAYER_API_KEY, DIVE_MASTER_ACH_ID) {
    var playerDiveMasterBits = [];
    var globalDiveMasterBits = {};

    var diveMaster = {};

    var locationTable = document.getElementsByTagName('table')[1];

    $.get('https://api.guildwars2.com/v2/account/achievements?access_token=' + PLAYER_API_KEY)
        .done(function(playerAchievements) {
            var playerDiveMasterAchievement = $.grep(playerAchievements, function(e){ return e.id == DIVE_MASTER_ACH_ID; });

            if (playerDiveMasterAchievement.length == 0) {
                playerDiveMasterBits = [];
            } else {
                playerDiveMasterBits = playerDiveMasterAchievement[0].bits;
            }

            $.get('https://api.guildwars2.com/v2/achievements?id=335')
                .done(function(diveMasterAchievement) {
                    globalDiveMasterBits = diveMasterAchievement.bits;

                    diveMaster = personalizeAchievement(playerDiveMasterBits, globalDiveMasterBits);
                    updateWiki(diveMaster);
                })
                .fail(function(data) {
                    locationTable.insertAdjacentHTML('afterend', '<p>Could not load global achievement data.</p>')
                    console.log(data);
                });
        })
        .fail(function(data) {
            locationTable.insertAdjacentHTML('afterend', '<p>Could not load player achievement data.</p>')
            console.log(data);
        });
}


/**
 * With bits from /v2/account/achievements and /v2/achievements?id=DIVE_MASTER_ACH_ID
 * return new object keyed by region
 *
 * @return Achievement object that is keyed by region
 */

function personalizeAchievement(playerDiveMasterBits, globalDiveMasterBits) {
    var diveMaster = {};

    /* 
        From API: 
            {type: "Text", text: "Maguuma Jungle Diving Point #8"}
        Modified:
            {type: "Text", text: "Maguuma Jungle Diving Point #8", completed: true}
    */
    playerDiveMasterBits.forEach(function(playerDiveMasterBit) {
        globalDiveMasterBits[playerDiveMasterBit].completed = true;
    });

    /*
            {
                'Maguuma Jungle': {
                    8: {
                        id: 0,
                        completed: true
                    }
                },
                'Ascalon': {
                    ...
                }
            }
    */
    globalDiveMasterBits.forEach(function(globalDiveMasterBit, i) {
        var locationAndNumber = globalDiveMasterBit.text.split(' Diving Point #');

        if (locationAndNumber.length == 1) {
            return;
        }
        
        var region     = locationAndNumber[0];
        var diveNumber = Number(locationAndNumber[1]);

        var completed = false;

        if (globalDiveMasterBit.completed !== undefined) {
            completed = globalDiveMasterBit.completed;
        }

        if (diveMaster[region] === undefined) {
            diveMaster[region] = {};
        }

        diveMaster[region][diveNumber] = {
            'id'       : i,
            'completed': completed
        };
    });

    return diveMaster;
}

setup();