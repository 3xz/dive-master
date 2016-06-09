// ==UserScript==
// @name           Dive Master Checklist
// @namespace      https://github.com/3xz
// @description    Adds a personalized checklist for the Guild Wars 2 Dive Master achievement.
// @version        1.3
// @include        *://wiki.guildwars2.com/wiki/Dive_Master
// @require        https://raw.githubusercontent.com/3xz/divemaster/master/jquery-2.2.3.min.js
// ==/UserScript==

/** 
 * Alternate way to save the API key
 */

function saveAPIKey(e) {
    localStorage.setItem('gw2dm_api_key', document.querySelector("#api_key").value);
}

/** 
 * Alternate way to restore the API key
 */

function restoreAPIKey() {
    var api_key = localStorage.getItem('gw2dm_api_key');

    if (!api_key) {
        document.querySelector("#api_key").value = '';
    } else {
        document.querySelector("#api_key").value = api_key;
    }
}

/**
 * Add a config box on the wiki page to compensate.
 */

function addFirefoxConfig() {
    var locationTable = document.getElementsByTagName('table')[1];

    var form     = document.createElement('form');
    var fieldset = document.createElement('fieldset');
    var legend   = document.createElement('legend');
    var input    = document.createElement('input');
    var button   = document.createElement('button');

    form.setAttribute('id', 'api_form');

    legend.textContent = 'Guild Wars 2 API Key';

    input.setAttribute('type', 'text');
    input.setAttribute('id', 'api_key');

    button.setAttribute('type', 'submit')
    button.textContent = 'Save';

    fieldset.appendChild(legend);
    fieldset.appendChild(input);
    fieldset.appendChild(button);

    form.appendChild(fieldset);

    locationTable.insertAdjacentHTML('afterend', form.outerHTML);

    restoreAPIKey();
    document.querySelector("#api_form").addEventListener("submit", saveAPIKey);
}

// Firefox's API to install addons is InstallTrigger. Undefined in Chrome.
if (typeof(InstallTrigger) !== 'undefined') {
    addFirefoxConfig();
}

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
    var PLAYER_API_KEY     = localStorage.getItem('gw2dm_api_key');
    var DIVE_MASTER_ACH_ID = 335;

    loadAchievementData(PLAYER_API_KEY, DIVE_MASTER_ACH_ID);

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