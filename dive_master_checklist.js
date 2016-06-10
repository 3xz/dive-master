/*
 * Save a recently-completed dive to local storage
 */

function saveLocalDive(diveID) {
    chrome.storage.local.get({localDive: []}, function(res) {
        var localDive = res.localDive;

        localDive.push(diveID);

        chrome.storage.local.set({
            localDive: localDive
        });
    });
}

/*
 * Delete a locally stored dive. 
 * (Maybe it was the wrong one, or programmatically removed)
 */

function delLocalDive(diveID) {
    chrome.storage.local.get({localDive: []}, function(res) {
        var newDives = [];

        res.localDive.forEach(function(dive) {
            if (dive != diveID) {
                newDives.push(dive);
            }
        });

        chrome.storage.local.set({
            localDive: newDives
        });
    });
}

/*
 * Setup the dive links
 */

function setDive(e) {
    var diveInfo = e.target.id;
    var diveLink = e.target;
    
    if (!e.target.id) {
        diveInfo = e.target.firstChild.id;
        diveLink = e.target.firstChild;
    }

    diveInfo = diveInfo.split('-');

    if (diveInfo[0] == 'save') {
        diveLink.innerHTML = '&#x2713';

        diveLink.setAttribute('title', 'Saved locally. Waiting for API to sync.');
        diveLink.setAttribute('id', 'unsave-' + diveInfo[1]);

        saveLocalDive(Number(diveInfo[1]));
    } else if (diveInfo[0] == 'unsave') {
        diveLink.innerHTML = '-';

        diveLink.setAttribute('id', 'save-' + diveInfo[1]);

        delLocalDive(Number(diveInfo[1]));
    }
}

/**
 * Setup checkbox to save newly completed dives to browser storage.
 *
 * @return HTML to put in <th>
 */

function setUnsyncedDive(diveID, completed) {
    var diveLink  = document.createElement('a');
    var saveState = 'save';

    if (completed) {
        saveState = 'unsave';

        diveLink.innerHTML = '&#x2713';

        diveLink.setAttribute('title', 'Saved locally. Waiting for API to sync.');
    } else {
        diveLink.textContent = '-';
    }

    diveLink.setAttribute('data-dive-id', diveID);
    diveLink.setAttribute('id', saveState + '-' + diveID);
    diveLink.setAttribute('style', 'cursor: pointer; text-decoration: none');

    document.querySelector('td[data-dive-id="' + diveID + '"]').addEventListener('click', setDive);

    return diveLink.outerHTML;
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
    tableRows[0].insertAdjacentHTML('afterbegin', '<th>&#x2713;</th>');

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

            tableRows[i].insertAdjacentHTML('afterbegin', '<td data-dive-region="' + currentRegion + '" data-dive-location-id="' + diveLocation + '"></td>');

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

    chrome.storage.local.get({localDive: []}, function(res) {
        for (var i = 0; i < tableRows.length; i++) {
            // Table headers don't have regions/data attributes
            if (tableRows[i].getElementsByTagName('th').length >= 1) {
                continue;
            }

            var currentRegion = tableRows[i].firstChild.dataset.diveRegion;
            var diveLocation  = tableRows[i].firstChild.dataset.diveLocationId;

            var diveID = diveMaster[currentRegion][diveLocation].id;

            var checklistString = '';

            tableRows[i].firstChild.setAttribute('data-dive-id', diveID);

            if (res.localDive !== undefined) {
                var localDives = res.localDive; 

                if (localDives.indexOf(diveID) > -1) {

                    if (diveMaster[currentRegion][diveLocation].completed) {
                        checklistString = '&#x2713';
                        delLocalDive(localDives[localDives.indexOf(diveID)]);
                    } else {
                        checklistString = setUnsyncedDive(diveID, true);
                    }
                } else if (diveMaster[currentRegion][diveLocation].completed) {
                    checklistString = '&#x2713';
                } else {
                    checklistString = setUnsyncedDive(diveID, false);
                }
            }

            tableRows[i].firstChild.innerHTML = checklistString;
        }
    });
}

/**
 * Load API key from storage, call function to load achievement data, and add
 * achievement checklist framework to wiki
 */

function setup() {
    var PLAYER_API_KEY     = '';
    var DIVE_MASTER_ACH_ID = 335;

    chrome.storage.local.get({localDive: []}, function(res) {
        if (res.localDive === undefined) {
            chrome.storage.local.set({
                localDive: []
            });
        }
    });

    chrome.storage.local.get('api_key', function(res) {
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
            locationTable.insertAdjacentHTML('afterend', '<p>Could not load player achievement data. Make sure the API key set in Options has "progression" set.</p>')
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