
import { Yoga, Node, Text } from 'sphere-runtime'
import { Button } from '../core/button.js'
import { findLeaderboard, downloadFriendLeaderboardScores, downloadOwnLeaderboardScore } from '../core/leaderboard.js'
// import { loadLocalizationFiles } from '@/scripts/core/loader'

export async function testLeaderboard()
{
    const leaderboard = await findLeaderboard("Repeater")
    const entries = await downloadFriendLeaderboardScores(leaderboard)
    console.log(entries)
}

export class SteamRequests extends Node
{
	constructor()
	{
		super()
			.setWidth("100%")
			.setHeight("100%")
			.setMargin(Yoga.EDGE_TOP, 0)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(darkestGray)

		this.content = new Node()
			.setWidth("100%")
			.setHeight("50%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setChildOf(this)

		this.text = new Text()
			.setWidth("100%")
			.setHeight(regularFontUI().height)
			.setFont(regularFontUI())
			.setColor(midGray)
			.setText(JSON.stringify({foo: "bar", hej: ["foo", "bar"]}, null, 4))
			.setTextAlign(textAlign.left)
			.setChildOf(this.content)

        this.requests = new Node()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setPosition(Yoga.EDGE_BOTTOM, "-1%")
			.setHeight("8%")
			.setWidth("100%")
            .setChildOf(this)

        this.testFoo = new Request(this, "foo", (parent) => {
			(async() => {
				const leaderboard = await findLeaderboard("Repeater")
				downloadFriendLeaderboardScores(leaderboard)
			})()
        })

            .setChildOf(this.requests)
        this.testReqFind = new Request(this, "find leaderboard", (parent) => {
            callback.steamAPI(ISteamUserStats.FindOrCreateLeaderboard("Test", ELeaderboardSortMethod.k_ELeaderboardSortMethodDescending, ELeaderboardDisplayType.k_ELeaderboardDisplayTypeNumeric))
                .then(result => {
                    parent.setMainText(`${result.m_bLeaderboardFound}`)
                    parent.leaderboard = result.m_hSteamLeaderboard
                })
        })
            .setChildOf(this.requests)

        this.testReqDown = new Request(this, "download score", (parent) => {
            callback.steamAPI(ISteamUserStats.DownloadLeaderboardEntries(parent.leaderboard, ELeaderboardDataRequest.k_ELeaderboardDataRequestGlobalAroundUser, 0, 0))
                .then(result => {
                    let allEntries = ""
                    for (let i = 0; i < result.m_cEntryCount; i++)
                    {
                        let entry = ISteamUserStats.GetDownloadedLeaderboardEntry(result.m_hSteamLeaderboardEntries, i, 0)
                        allEntries += `${JSON.stringify(entry, null, 4)}\n\n`
                    }
                    parent.setMainText(allEntries)
                })
        })
            .setChildOf(this.requests)

        this.testReqUp = new Request(this, "upload score", (parent) => {
            callback.steamAPI(ISteamUserStats.UploadLeaderboardScore(parent.leaderboard, ELeaderboardUploadScoreMethod.k_ELeaderboardUploadScoreMethodForceUpdate, 101, []))
                .then(result => {
                    parent.setMainText(`m_bSuccess: ${result.m_bSuccess}, m_hSteamLeaderboard: ${result.m_hSteamLeaderboard}, m_nScore: ${result.m_nScore}, m_bScoreChanged: ${result.m_bScoreChanged}, m_nGlobalRankNew: ${result.m_nGlobalRankNew}, m_nGlobalRankPrevious: ${result.m_nGlobalRankPrevious}`)
                })
        })
            .setChildOf(this.requests)

        this.testRand = new Request(this, "Rand", (parent) => {
			testSubscribe()
        })
            .setChildOf(this.requests)

        this.testWorkshop = new Request(this, "workshop", (parent) => {
			testWorkshop()
        })
            .setChildOf(this.requests)
        this.leaderboard = null;
	}

	refresh() {}

    setMainText(text)
    {
        this.text.setText(text)
    }
}

async function testSubscribe()
{
	const count = ISteamUGC.GetNumSubscribedItems()
	const items = ISteamUGC.GetSubscribedItems(count)
	console.log(items)
	for(const item of items.pvecPublishedFileID)
	{
		const installInfo = ISteamUGC.GetItemInstallInfo(item, 200)
		console.log(installInfo.pchFolder)
		loadLocalizationFiles(installInfo.pchFolder)
	}
}

function copyFile(src, dst)
{
	const data = FS.readFile(src, DataType.Raw)
	FS.writeFile(dst, data)
}

function createModTemplate(name)
{
	const modPath = "~/mods/"
	const newModPath = modPath + name + "/"
	const templatePath = "@/mod_template/"
	try
	{
		FS.createDirectory(modPath)
		FS.createDirectory(newModPath)
		copyFile(templatePath + "metadata.json", newModPath + "metadata.json")
		copyFile(templatePath + "preview.png", newModPath + "preview.png")

		FS.createDirectory(newModPath + "content/")
		let contentFolder = new DirectoryStream(templatePath + "content/")
		while(true)
		{
			let file = contentFolder.next()
			if (file.done)
				break
			copyFile(file.value.fullPath, newModPath + "content/" + file.value.fileName)
		}
	}
	catch(e)
	{
		console.log(`Failed to create mod template: ${e}`)
		return
	}
}

async function testWorkshop()
{
	const name = "test_template"
	createModTemplate(name)

	const appId = ISteamUtils.GetAppID()
	console.log(appId)
	const createItem = await callback.steamAPI(ISteamUGC.CreateItem(appId, EWorkshopFileType.k_EWorkshopFileTypeCommunity))
	// print result
	console.log(createItem)

	// check if success
	if ( createItem.m_eResult != EResult.k_EResultOK )
	{
		console.log(`Failed to create item: ${EResult[createItem.m_eResult]}`)
		return
	}

	const updateHandle = ISteamUGC.StartItemUpdate(appId, createItem.m_nPublishedFileId)
	console.log(`updateHandle: ${updateHandle}`)

	const modPath = FS.getSaveDirectory() + "/mods/"
	const newModPath = modPath + name + "/"

	// Load metadata file
	const metadata = await File.load(newModPath + "metadata.json")
	const data = JSON.parse(metadata)

	if (!ISteamUGC.SetItemTitle(updateHandle, data.title))
		console.log("Failed to set title")
	if (!ISteamUGC.SetItemDescription(updateHandle, data.description))
		console.log("Failed to set description")
	if (!ISteamUGC.SetItemUpdateLanguage(updateHandle, data.language))
		console.log("Failed to set language")

	if (!ISteamUGC.SetItemPreview(updateHandle, newModPath + "preview.png"))
		console.log("Failed to set preview file")
	if (!ISteamUGC.SetItemVisibility(updateHandle, ERemoteStoragePublishedFileVisibility.k_ERemoteStoragePublishedFileVisibilityPrivate))
		console.log("Failed to set visibility")
	if (!ISteamUGC.SetItemTags(updateHandle, ["Foo"], false))
		console.log("Failed to set tags")
	if (!ISteamUGC.SetItemContent(updateHandle, newModPath + "content/"))
		console.log("Failed to set content")

	const submitResult = await callback.steamAPI(ISteamUGC.SubmitItemUpdate(updateHandle, "test1"))

	console.log(submitResult)

	if ( submitResult.m_eResult != EResult.k_EResultOK )
	{
		console.log(`Failed to submit item: ${EResult[submitResult.m_eResult]}`)
		return
	}
}

class Request extends Button
{
	constructor(parent, text, action)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setTexture(midGray)
			.setWidth("15%")
			.setHeight(50)

		this.text = new Text()
			.setColor(paleYellow)
			.setFont(typingFontSmall)
			.setText(text)
			.setTextAlign(textAlign.center)
			.setChildOf(this)

		this.parent = parent
        this.action = action
		return this
	}

	focusStart()
	{
        this.setTexture(darkGray)
	}

	focusEnd()
	{
        this.setTexture(midGray)
	}

	pressMouseLeftStart()
	{
        this.parent.setMainText("loading...")
        this.action(this.parent)
	}
}