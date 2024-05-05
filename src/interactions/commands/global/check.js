let { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
let dataFile = require('../../../modules/bgcheckData')

let noblox = require('noblox.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('run an account check')
        .addStringOption(option => 
            option.setName('username')
                .setDescription('User to background check')
                .setRequired(true))

        .addStringOption(option => 
            option.setName('accuracy')
                .setDescription('Start with standard, bot will tell you if you should use high or extreme. Takes longer')
                .setRequired(false)
                .addChoices(
                    {name: 'extreme', value: 'extreme'},
                    {name: 'high', value: 'high'},
                    {name: 'standard', value: 'standard'},
                ))

        /*.addStringOption(option => 
            option.setName('debug')
                .setDescription('Enable debug')
                .setRequired(false)
                .addChoices(
                    {name: 'true', value: 'true'},
                    {name: 'false', value: 'false'},
                ))*/,
        
    async execute(command_interaction, client) {

        let timeNow = Math.round(new Date().getTime() / 1000);
        let timeNowUnixRelative = `<t:${timeNow}:R>`;

        let target = command_interaction.options.getString('username');
        //let debugMode = command_interaction.options.getString('debug');
        let accuracy = command_interaction.options.getString('accuracy') || 'standard';

        let dumpChannel = await client.channels.cache.get('1216268106037592204')

        async function getGameName(placeId) {
            return new Promise((resolve, reject) => {
                dumpChannel.send(`https://www.roblox.com/games/${placeId}/a`)
                    .then(message => {
                        setTimeout(() => {
                            if (message.embeds && message.embeds.length > 0) {
                                resolve(message.embeds[0].title);
                            } else {
                                resolve(placeId);
                            }
                        }, 2000);
                    })
                    .catch(error => {
                        reject(error);
                    });
            });
        }

        async function getUserThumbnail(id) {
            await noblox.getPlayerThumbnail(id, "720x720", "png", false, "headshot").then((thumbnail) => {
                let matchesTarget = thumbnail.filter(f => f.targetId == id);
                target = matchesTarget.length > 0 ? matchesTarget[0] : null;
            })
            return target
        }

        async function debug(givenMessage) {
            /*if (debugMode == 'true') {
                let debugMessage = await command_interaction.channel.send(`\`${timeNow}:\` ${givenMessage}`);

                setTimeout(async () => {
                    try {
                        await debugMessage.delete();
                    } catch (error) {
                        return;
                    }
                }, 30000);  
            }*/
            return
        }

        let footerText = {
            'standard': 'Standard accuracy',
            'high': 'This process will take longer as higher accuracy is being used.',
            'extreme': 'This process will take extremely long as extreme accuracy is being used.'
        }[accuracy];
        
        let FetchingEmbed = new EmbedBuilder()
            .setTitle('Background Check')
            .setDescription(`Pending check on \`${target}\` \nBegan ${timeNowUnixRelative}`)
            .setFooter({ text: footerText });

        command_interaction.reply({
            embeds: [FetchingEmbed],
        })

        noblox.getIdFromUsername(target).then(async id => {
            if (id) {
                noblox.getPlayerInfo(parseInt(id)).then(async function(info) {

                    if (info.isBanned) {
                        command_interaction.editReply({
                            content: `User is currently banned from Roblox. Unable to Background Check.`,
                            embeds: [],
                        })
                        return;
                    };

                    // placeholders
                    let alerts = '```diff\n';
                    let suspicions = '';
                    let chronicle = 0;

                    let privateInventory = 'false';
                    let altRating = '';
                    let recommendation = '';

                    let sandhurstAlerts = '```diff\n';
                    let sandhurstSuspicions = '';

                    let amendments = '```diff\n';

                    let alertPrefix = '-';
                    let suspicionPrefix = '#';

                    let badgeGetAmount = 250;
                    let inventoryItemsGetAmount = 15;

                    // change data limits for accuracy
                    let accuracyValues = {
                        'high': { badgeGetAmount: 1000, inventoryItemsGetAmount: 50 },
                        'extreme': { badgeGetAmount: 2500, inventoryItemsGetAmount: 75 }
                    };
                    
                    if (accuracyValues.hasOwnProperty(accuracy)) {
                        let values = accuracyValues[accuracy];
                        badgeGetAmount = values.badgeGetAmount;
                        inventoryItemsGetAmount = values.inventoryItemsGetAmount;
                    };

                    debug('Established check parameters');

                    // handle user account age for showing in embed and alerts
                    let createdTimestamp = new Date(info.joinDate);
                    let accountCreated = Math.floor(createdTimestamp.getTime() / 1000);
                    let accountCreatedYears = (info.age / 365).toFixed(1);
                    let accountCreatedMonths = (accountCreatedYears * 12).toFixed(1);
                    let accountCreatedDays = info.age;

                    let accountAgeShow;

                    if (accountCreatedDays <= 30) {
                        accountAgeShow = `${accountCreatedDays} days`;
                    } else if (accountCreatedDays <= 365) {
                        accountAgeShow = `${accountCreatedMonths} months`;
                    } else {
                        accountAgeShow = `${accountCreatedYears} years`;
                    }

                    debug('Established user account age');

                    // handle user past usernames for displaying in embed
                    let pastUsernamesAmount;

                    let pastUsernames = String(info.oldNames);
                    if (pastUsernames.length === 0) {
                        pastUsernames = 'None';
                    } else {
                        pastUsernames = `\`${pastUsernames.replace(/,(?=[^\s])/g, ", ")}\``;

                        let pastNamesArray = pastUsernames.split(',');
                        pastUsernamesAmount = pastNamesArray.length;
                        if (pastUsernamesAmount >= 10) {
                            let mostRecentNames = pastNamesArray.reverse();
                            let lastTenNames = mostRecentNames.slice(0, 10);

                            pastUsernames = `\`${lastTenNames.toString()}\`  **+${pastNamesArray.length - 10}**`;
                        }
                    }

                    debug('Received user past usernames');

                    let totalRobuxSpentOnUsernames = 1000 * pastUsernamesAmount || 0;

                    // get user avatar, badge, groups and inventory data
                    let userThumbnail = await getUserThumbnail(id);
                    let userGroups = await noblox.getGroups(id);

                    let inventoryAssets = await noblox.getInventory({ userId: id, assetTypes: ['Shirt', 'Pants', 'TShirt'], sortOrder: "Asc", limit: inventoryItemsGetAmount + 1 }).catch(error => {
                        privateInventory = 'true';
                    })

                    let inventoryAssetsAccessories = await noblox.getInventory({ userId: id, assetTypes: ['Hat', 'FaceAccessory', 'WaistAccessory', 'BackAccessory', 'FrontAccessory', 'ShoulderAccessory', 'NeckAccessory'], sortOrder: "Asc", limit: inventoryItemsGetAmount + 1 }).catch(error => {
                        privateInventory = 'true';
                    })

                    let limiteds = await noblox.getCollectibles({ userId: id, sortOrder: "Asc", limit: 2 }).catch(error => {
                        privateInventory = 'true';
                    })

                    if (Object.is(inventoryAssets, undefined) || Object.is(inventoryAssetsAccessories, undefined) || Object.is(limiteds, undefined)) {
                        privateInventory = 'true';
                    }

                    let badges = await noblox.getPlayerBadges(id, badgeGetAmount);

                    debug('Received user group, badge, inventory and avatar information');

                    // detect roblox owned accessories
                    if (privateInventory == 'false') { 
                        let bannedItemsList = dataFile.RobloxOwnedItems;

                        let totalAvatarItems = inventoryAssets.length + inventoryAssetsAccessories.length;
                        let flaggedItems = 0;

                        for (let accessory of inventoryAssetsAccessories) {
                            let itemName = accessory.name.toLowerCase();
                            let ownedItemsLowerCase = bannedItemsList.map(item => item.toLowerCase());
                        
                            if (ownedItemsLowerCase.includes(itemName)) {
                                flaggedItems++;
                            } else {
                                let containsOwnedItem = ownedItemsLowerCase.some(ownedItem => itemName.includes(ownedItem));
                                if (containsOwnedItem) {
                                    flaggedItems++;
                                };
                            };
                        };

                        // detect roblox owned clothing
                        for (let clothing of inventoryAssets) {
                            let itemName = clothing.name.toLowerCase();
                            let ownedItemsLowerCase = bannedItemsList.map(item => item.toLowerCase());
                        
                            if (ownedItemsLowerCase.includes(itemName)) {
                                flaggedItems++;
                            } else {
                                let containsOwnedItem = ownedItemsLowerCase.some(ownedItem => itemName.includes(ownedItem));
                                if (containsOwnedItem) {
                                    flaggedItems++;
                                };
                            };
                        }

                        let legitAccessories = totalAvatarItems - flaggedItems;
                        let fakeItemsPercentage = Math.floor(100 * (flaggedItems / totalAvatarItems));

                        if (fakeItemsPercentage >= 50) {
                            let purchasedAccessories = totalAvatarItems - legitAccessories;
                            let itemDescription = purchasedAccessories === 1 ? 'accessory or clothing' : 'accessories and clothing';
                        
                            alerts += `${alertPrefix} A majority of this user's accessories and clothing (${fakeItemsPercentage}%) are free from Roblox. Out of ${totalAvatarItems} ${itemDescription}, ${legitAccessories} are purchased and legitimate. \n`;
                            chronicle += dataFile.ChronicleWeights['SpamAvatarItems'];
                        };
                        
                        debug('Established legitimacy of user inventory items');
                    };

                    // detect badge walks
                    function countOccurrences(array) {
                        let occurrences = {};
                        for (let element of array) {
                            occurrences[element] = (occurrences[element] || 0) + 1;
                        }
                        return occurrences;
                    };
                    
                    let numbers = badges.map(badge => badge.awarder.id);
                    let occurrenceResult = countOccurrences(numbers);
                                  
                    for (let [gameId, count] of Object.entries(occurrenceResult)) {
                        if (count >= 50) {
                            let gameName = await getGameName(gameId)

                            alerts += `${alertPrefix} This user has possibly done a badge walk, possessing ${count} badges from the game "${gameName}" \n`;
                            chronicle += dataFile.ChronicleWeights['BadgeWalk'];
                        };
                    };

                    debug('Established legitimacy of user badges');

                    let badgeCount = (badges.length >= badgeGetAmount) ? '>' + badgeGetAmount : badges.length;
                    let badgePages = Math.floor(badges.length / 30);

                    // handle alerts and chroncile for account age
                    let thresholds = [7, 14, 30, 60, 90, 180];

                    for (let threshold of thresholds) {
                        if (info.age <= threshold) {
                            let weightKey = (threshold <= 90) ? 'Less' + threshold + 'AccountAge' : 'Less180AccountAge';
                            let alertMessage = (threshold <= 90) ? alerts : suspicions;

                            alertMessage += `${(threshold <= 90) ? alertPrefix : suspicionPrefix} This user's account age is less than ${threshold} days. \n`;
                            chronicle += dataFile.ChronicleWeights[weightKey];

                            break;
                        };
                    };

                    debug('Established legitimacy of user account age');

                    // detect spam groups
                    let groupCount = 0;

                    for (let group of userGroups) {
                        if (group.MemberCount >= 150000) {
                            groupCount++;
                        }
                    }

                    let spamGroupPercentage = Math.floor(100 * (groupCount / userGroups.length));

                    if (spamGroupPercentage >= 50) {
                        alerts += `${alertPrefix} A majority of this user's groups (${spamGroupPercentage}%) are among the most popular on Roblox (>150k). This user may have joined the first groups they saw on the home page in order to boost their group count. \n`;
                        chronicle += dataFile.ChronicleWeights['SpamGroups'];
                    }

                    // handle estimate of badges earned per year
                    if (badges.length > 0 && ((accountCreatedYears <= 1 && badges.length <= 40) || (accountCreatedYears <= 6 && badges.length / accountCreatedYears <= 40))) {
                        if (accountCreatedYears <= 1) {
                            alerts += `${alertPrefix} This user has earned less than 40 badges in their <1 year of being on the platform \n`;
                            chronicle += dataFile.ChronicleWeights['Less40BadgesPerYear'];
                        } else {
                            alerts += `${alertPrefix} This user has earned less than 40 badges per year of being on the platform (${badges.length} Badges / ${accountCreatedYears} Years) \n`;
                            chronicle += dataFile.ChronicleWeights['Less40BadgesPerYear'];
                        };
                    };
                    
                    debug('Established legitimacy of user badges per year');

                    // handle badge page alerts
                    if (badges.length === 0) {
                        alerts += `${alertPrefix} This user has 0 badges. \n`;
                        chronicle += dataFile.ChronicleWeights['NoBadges'];
                    } else if (accountCreatedMonths >= 1 && badges.length < badgeGetAmount) {
                        if (accountCreatedMonths >= 12 && dataFile.ExpectedPages[Math.floor(accountCreatedYears)] && badgePages < dataFile.ExpectedPages[Math.ceil(accountCreatedYears)]) {
                            alerts += `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only has ${badgePages} pages of badges. \n`;
                            chronicle += dataFile.ChronicleWeights['LessRecommenedPages'];
                        } else if (badgePages <= 1) {
                            alerts += `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only has one page of badges. \n`;
                            chronicle += dataFile.ChronicleWeights['Less2BadgePages'];
                        } else if (badgePages <= 5) {
                            alerts += `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only has ${badgePages} pages of badges. \n`;
                            chronicle += dataFile.ChronicleWeights['Less5BadgePages'];
                        };
                    };

                    debug('Established legitimacy of user badge pages');

                    // handle lacking limiteds, avatar items
                    if (privateInventory === 'true') {
                        suspicions += `${suspicionPrefix} This user's inventory is private. \n`;
                        chronicle += dataFile.ChronicleWeights['PrivateInventory'];
                    } else {
                        // no limiteds
                        if (limiteds.length === 0) {
                            suspicions += `${suspicionPrefix} This user does not have any limited items (collectibles). \n`;
                            chronicle += dataFile.ChronicleWeights['NoLimiteds'];
                        }
                        
                        // less 15 accessories or clothing
                        if (inventoryAssets.length <= 15 || inventoryAssetsAccessories.length <= 15) {
                            let clothingMessage = inventoryAssets.length <= 15 ?
                                `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only owns ${inventoryAssets.length} shirts, pants, and t-shirts. \n` :
                                `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only owns ${inventoryAssetsAccessories.length} accessories. \n`;
                        
                            alerts += clothingMessage;
                            chronicle += dataFile.ChronicleWeights['Less15ClothingItems'];
                        }
                    }
                    
                    debug('Established amount of users inventory items')

                    // handle alerts for friend count
                    if (info.friendCount === 0) {
                        alerts += `${alertPrefix} This user has 0 friends. \n`;
                        chronicle += dataFile.ChronicleWeights['NoFriends'];
                    } else {
                        if (info.accountCreatedYears <= 1) {
                            let friendCountMessage = info.friendCount === 1 ?
                                `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only has 1 friend. \n` :
                                `${alertPrefix} Despite the account age of ${accountAgeShow}, this user only has ${info.friendCount} friends. \n`;

                            alerts += friendCountMessage;
                            chronicle += dataFile.ChronicleWeights['LessFriends'];
                        } else {
                            let expectedFollowPresence = dataFile.ExpectedFollowPresence[Math.floor(accountCreatedYears)];
                            if (info.friendCount < expectedFollowPresence) {
                                alerts += `${alertPrefix} This user has fewer friends than recommended based on their account age (${accountCreatedYears}: ${expectedFollowPresence}) \n`;
                                chronicle += dataFile.ChronicleWeights['LessFriends'];
                            }
                        }
                    }

                    debug('Established user friend count');
                    
                    // handle alerts for group count
                    let userGroupsLength = userGroups.length;

                    let groupMessage = userGroupsLength === 0 ? 
                        `${alertPrefix} This user is in 0 groups. \n` :
                        userGroupsLength === 1 ? 
                        `${alertPrefix} This user is only in 1 group. \n` :
                        userGroupsLength <= 5 ?
                        `${alertPrefix} This user is only in ${userGroupsLength} groups. \n` :
                        '';

                    alerts += groupMessage;
                    chronicle += userGroupsLength === 1 ? 3.5 : userGroupsLength > 1 && userGroupsLength <= 5 ? dataFile.ChronicleWeights['Less5Groups'] : dataFile.ChronicleWeights['NoGroups'];

                    debug('Established user group count');

                    // handle ba background checks
                    let finalSandhurstJoinDate;
                    let accountCreatedRelative;
                    let sandhurstJoinDateNotFinal = await noblox.getAwardedTimestamps(id, [2124698974]);

                    // never joined sandhurst
                    if (sandhurstJoinDateNotFinal.data.length === 0) {
                        finalSandhurstJoinDate = 'Has never played Sandhurst.';
                        accountCreateSandhurstJoinRelationDays = 'Has never played Sandhurst.';
                        accountCreatedRelative = 'Has never played Sandhurst.';
                    } else {

                        // get sandhurst join date
                        let sandhurstJoinDateRaw = sandhurstJoinDateNotFinal.data[0].awardedDate;
                        let sandhurstSlicedJoinDate = sandhurstJoinDateRaw.split(':')[0].slice(0, -3);

                        let dateObject = new Date(sandhurstSlicedJoinDate);
                        let sandhurstJoinDateUnix = Math.floor(dateObject.getTime() / 1000);

                        // joined before the badge existed
                        if (sandhurstJoinDateUnix <= 1615035600) {
                            finalSandhurstJoinDate = '`Before March 2021 (3+ Years Ago)`';
                        } else {
                            finalSandhurstJoinDate = `<t:${sandhurstJoinDateUnix}:D> (<t:${sandhurstJoinDateUnix}:R>)`;
                        };

                        // get the days since they joined sandhurst
                        let accountCreateSandhurstJoinRelationMS = sandhurstJoinDateUnix - accountCreated;
                        let accountCreateSandhurstJoinRelationDays = Math.floor(accountCreateSandhurstJoinRelationMS / 86400);
                        accountCreateSandhurstJoinRelationMS %= 86400;

                        // handle joining within x days from registering their account
                        if (accountCreateSandhurstJoinRelationDays === 1) {
                            sandhurstAlerts += `${alertPrefix} This user attempted to join Sandhurst less than a day after registering their account. \n`;
                            sandhurstAlerts += `${alertPrefix} Sandhurst Military Academy was one of the first games this user ever played. \n`;
                            chronicle += dataFile.ChronicleWeights['Within1DayJoinedBA'];
                        } else if (accountCreateSandhurstJoinRelationDays > 1 && accountCreateSandhurstJoinRelationDays <= 30) {
                            sandhurstAlerts += `${alertPrefix} This user first joined Sandhurst only ${accountCreateSandhurstJoinRelationDays} days after registering their account. \n`;
                            chronicle += dataFile.ChronicleWeights['Within30DaysJoinedBA'];
                        };

                        // text for displaying in embed
                        if (accountCreateSandhurstJoinRelationDays === 1) {
                            accountCreatedRelative = '`<1 day` after registering their account.';
                        } else if (accountCreateSandhurstJoinRelationDays <= 30) {
                            accountCreatedRelative = `${accountCreateSandhurstJoinRelationDays} days after registering their account.`;
                        } else if (accountCreateSandhurstJoinRelationDays <= 365) {
                            let accountCreatedRelativeMonths = (accountCreateSandhurstJoinRelationDays / 30).toFixed(2);
                            accountCreatedRelative = `${accountCreatedRelativeMonths} months after registering their account.`;
                        } else {
                            let accountCreatedRelativeYears = (accountCreateSandhurstJoinRelationDays / 365).toFixed(2);
                            accountCreatedRelative = `${accountCreatedRelativeYears} years after registering their account.`;
                        };
                    };

                    // complete alerts and suspicions, finalise strings to display in embeds
                    sandhurstAlerts += `\n${sandhurstSuspicions}\n\`\`\``;

                    if (sandhurstAlerts.split("\n")[1].length === 0) {
                        sandhurstAlerts = '```diff\n+ No flags or suspicions\n```';
                    };

                    if (pastUsernamesAmount >= 1) {
                        let usernameRobuxChronicleReduction = 0.1
                        chronicle -= usernameRobuxChronicleReduction * pastUsernamesAmount
                        amendments += `+ ${totalRobuxSpentOnUsernames.toLocaleString()} Robux spent on username changes \n`
                    };

                    amendments += '\n```';

                    if (amendments.split("\n")[1].length === 0) {
                        amendments = '```diff\n# No amendments\n```';
                    };

                    alerts += `\n${suspicions}\n\`\`\``;

                    if (alerts.split("\n")[1].length === 0) {
                        alerts = '```diff\n+ No flags or suspicions\n```';
                    };

                    // establish alt rating
                    let probableChronicle = 10;
                    let potentialChronicle = 5;
                    let lowChronicle = 2.5;
                    let noneChronicle = 0.5;

                    chronicle = chronicle < 0 ? 0 : chronicle;

                    if (chronicle >= probableChronicle) {
                        altRating = 'Probable';
                    } else if (chronicle.toFixed(2) >= potentialChronicle && chronicle.toFixed(2) <= probableChronicle - 0.01) {
                        altRating = 'Potential';
                    } else if (chronicle.toFixed(2) >= lowChronicle && chronicle.toFixed(2) <= potentialChronicle - 0.01) {
                        altRating = 'Less Likely';
                    } else if (chronicle.toFixed(2) < lowChronicle && chronicle.toFixed(2) >= noneChronicle + 0.01) {
                        altRating = 'Less Likely';
                    } else if (chronicle.toFixed(2) <= noneChronicle) {
                        altRating = 'Improbable';
                    };

                    // old bug that used to happen
                    /*if (altRating.length === 0) {
                        let failedEmbed = new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription(`Unable to establish an alt rating for this user. Chroncile count most likely in deadzone. \nChronicle score: ${chronicle.toFixed(2)}`)
                            .setTimestamp()

                        await command_interaction.editReply({
                            embeds: [failedEmbed]
                        })

                        return;
                    }*/

                    // recommend higher accuracy if they have more badges or inventory items than get amount, can lead to finding more badges from badge walks
                    if ((accuracy === 'standard' || accuracy === 'high') && 
                        (badges.length === badgeGetAmount || 
                        inventoryAssets.length === inventoryItemsGetAmount || 
                        inventoryAssetsAccessories.length === inventoryItemsGetAmount)) {
                        recommendation = (accuracy === 'standard') ? 'High accuracy background check recommended due to incomplete data' : 'Extreme accuracy background check recommended due to incomplete data';
                    };

                    // final strings for embed
                    let accountInformationString = `User ID: \`${id}\` \nAccount Age: \`${accountAgeShow}\` \nAccounted Created: <t:${accountCreated}:f> \nBadge Count: \`${badgeCount}\` \nFriends: \`${info.friendCount}\` \nFollowing: \`${info.followingCount}\` \nPast Usernames: ${pastUsernames}`;
                    let britishArmyBackgroundCheckString = `${sandhurstAlerts} \nSandhurst Military Academy Join Date: ${finalSandhurstJoinDate} \nJoined Sandhurst: ${accountCreatedRelative}`;
                    let amendmentsString = `${amendments}`;
                    let altRatingString = `This user scored ${chronicle.toFixed(2)}/10.00`;

                    let finishedTime = Math.round(new Date().getTime() / 1000);
                    let totalTime = (finishedTime - timeNow);

                    // show recommendation or not
                    let desc = `### Account Information \n${accountInformationString}\n### Account Background Check \n${alerts}\n### British Army Background Check \n${britishArmyBackgroundCheckString}\n### Amendments \n${amendmentsString}\n### Alt Probability: ${altRating} \n${altRatingString}`;
                    if (recommendation.includes('incomplete')) {
                        desc += `\n### ${recommendation}`;
                    };

                    let finalisedEmbed = new EmbedBuilder()
                        .setTitle(`${info.username} (${id})`)
                        .setColor(dataFile.Colours[altRating])
                        .setThumbnail(userThumbnail.imageUrl)
                        .setURL(`https://www.roblox.com/users/${id}/profile`)
                        .setDescription(desc)
                        .setFooter({text: `Completed in ${totalTime} seconds, ${accuracy} accuracy`});
                
                    command_interaction.editReply({
                        embeds: [finalisedEmbed]
                    });
                })
            } else {
                setTimeout(() => {
                    command_interaction.editReply({
                        content: `No user by the name of ${target} was found. Did you provide a valid Roblox username?`,
                        embeds: []
                    });

                    return;
                }, 1000);
            }

        }).catch(function(err) {
            setTimeout(() => {
                command_interaction.editReply({
                    content: `An error checking ${target} occured. \n${err}`,
                    embeds: []
                });

                console.log(err)
                return;
            }, 1000);
        });
    },
};