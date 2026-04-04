import { Random } from 'sphere-runtime'
export const workshopConsole = {
	create: createModTemplate,
	upload: uploadMod,
	update: update,
	test: testWorkshop,
	localMods: localMods,
	testList: testListUploadedMods,
	subscribed: testListSubscribedItems,
	reload: reloadMods
}

function generateRandomModId()
{
	return Random.string(8)
}

async function readOrGenerateRandomModId(folderPath)
{
	const modIdFile = folderPath + "/generated_mod_id.txt"
	if (await File.exists(modIdFile)) {
		const modId = JSON.parse(await File.load(modIdFile)).modId
		if (modId) {
			return modId
		}
	}
	const modId = generateRandomModId()
	await File.save(modIdFile, JSON.stringify({modId: modId}))
	return modId
}

function copyFile(src, dst)
{
	const data = FS.readFile(src, DataType.Raw)
	FS.writeFile(dst, data)
}

const InternalModPath = "~/mods/"

function getModPathForSteam(name)
{
	return FS.getSaveDirectory() + "mods/" + name + "/"
}

// Mod file validation
function validateWordlist(wordlist)
{
	// Has mod key
	if (!wordlist.mod) {
		throw new Error("Wordlist must have a mod key")
	}

	// Has language_name key
	if (!wordlist.mod.language_name) {
		throw new Error("Wordlist must have a language_name")
	}

	// Has words for each word length
	for (let wordLength = 4; wordLength <= 9; wordLength++) {
		const words = wordlist.mod[wordLength.toString()]
		if (!words) {
			throw new Error(`Wordlist must have a ${wordLength} letter word`)
		}
		// Check length of words in the array
		for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
			const word = words[wordIndex]
			if (typeof word !== "string" && !Array.isArray(word)) {
				throw new Error(`Word at index ${wordIndex} in length ${wordLength} is not a string or array.`)
			}
		// 	if (word.length !== wordLength) {
		// 		throw new Error(`Word "${word}" is not ${wordLength} letters long`)
		// 	}
		}
	}
	return true
}

function validateTriggers(triggers)
{
	// Has mod key
	if (!triggers.mod) {
		throw new Error("Triggers must have a mod key")
	}

	// Has trigger categories
	const triggerCategories = ["Spectre", "Hunter", "Tesla", "Blade", "Minefield", "Orbiter", "Extra_1", "Extra_2"]
	for (const category of triggerCategories) {
		if (!triggers.mod[category]) {
			throw new Error(`Triggers must have a ${category} category`)
		}
		const categoryTriggers = triggers.mod[category]
		for (let triggerIndex = 0; triggerIndex < categoryTriggers.length; triggerIndex++) {
			const trigger = categoryTriggers[triggerIndex]
			if (typeof trigger !== "string") {
				throw new Error(`Trigger "${trigger}" is not a string`)
			}
			if (trigger.length !== 1) {
				throw new Error(`Trigger "${trigger}" is not 1 character long`)
			}
		}
	}
	return true
}

function validateParagraphs(paragraphs)
{
	// Has mod key
	if (!paragraphs.mod) {
		throw new Error("Paragraphs must have a mod key")
	}

	const paragraphsArray = paragraphs.mod
	if (!Array.isArray(paragraphsArray)) {
		throw new Error("Paragraphs must be an array")
	}

	if (paragraphsArray.length === 0) {
		throw new Error("Paragraphs must not be empty")
	}

	for (let paragraphIndex = 0; paragraphIndex < paragraphsArray.length; paragraphIndex++) {
		const paragraph = paragraphsArray[paragraphIndex]
		if (!typeof paragraph === "string") {
			throw new Error(`Paragraph at index ${paragraphIndex} is not a string`)
		}
		if (paragraph.length === 0) {
			throw new Error(`Paragraph at index ${paragraphIndex} is empty`)
		}
	}
	return true
}

async function validateModContentFolder(contentFolder)
{
	let dirStream = new DirectoryStream(contentFolder)
	let file = dirStream.next()
	while(!file.done) {
		if (file.value.extension === ".wordlist") {
			try {
				let wordlist = await File.load(file.value.fullPath)
				validateWordlist(JSON.parse(wordlist))
			} catch (e) {
				console.log(`Failed to validate wordlist: ${e}`)
				throw new Error(`Failed to validate wordlist: ${e}`)
			}
		} else if (file.value.extension === ".triggers") {
			try {
				let triggers = await File.load(file.value.fullPath)
				validateTriggers(JSON.parse(triggers))
			} catch (e) {
				console.log(`Failed to validate triggers: ${e}`)
				throw new Error(`Failed to validate triggers: ${e}`)
			}
		} else if (file.value.extension === ".paragraphs") {
			try {
				let paragraphs = await File.load(file.value.fullPath)
				validateParagraphs(JSON.parse(paragraphs))
			} catch (e) {
				console.log(`Failed to validate paragraphs: ${e}`)
				throw new Error(`Failed to validate paragraphs: ${e}`)
			}
		}
		file = dirStream.next()
	}
}

export async function createModTemplate(name, baseLanguage = "english")
{
	if( !(baseLanguage in wordlists) )
	{
		console.log(`Base language "${baseLanguage}" not found.`)
		return
	}

	if( !name ) {
		console.log("Please provide a name for the mod template.")
		return
	}

	const newModPath = InternalModPath + name + "/"
	const templatePath = "@/mod_template/"
	if ( FS.directoryExists(newModPath) )
	{
		console.log(`Mod "${name}" already exists.`)
		return
	}

	try
	{
		FS.createDirectory(InternalModPath)
		FS.createDirectory(newModPath)

		const metadataFile = templatePath + "metadata.json"
		const metadata = await File.load(metadataFile)
		const data = JSON.parse(metadata)
		data.baseLanguage = baseLanguage
		data.title = name
		File.save(newModPath + "metadata.json", JSON.stringify(data, null, 2))

		copyFile(templatePath + "preview.png", newModPath + "preview.png")

		FS.createDirectory(newModPath + "content/")
		const languageFileEndings = [ ".paragraphs", ".wordlist", ".triggers" ]
		for (const ending of languageFileEndings) {
			const filename = baseLanguage + ending
			const languageFile = "@/localization/" + filename
			if (await File.exists(languageFile)) {
				// Replace top level key, e.g. "english" with "mod"
				const fileContents = await File.load(languageFile)
				let jsonObj = JSON.parse(fileContents)
				const topLevelKeys = Object.keys(jsonObj)
				if (topLevelKeys.length === 1) {
					const originalKey = topLevelKeys[0]
					const value = jsonObj[originalKey]
					jsonObj = { mod: value }
				}
				else {
					continue
				}

				if (ending === ".wordlist") {
					jsonObj.mod.language_name = name
				}

				await File.save(newModPath + "content/" + "mod" + ending, JSON.stringify(jsonObj, null, 2))
			}
		}

		const savePath = FS.getSaveDirectory();
		console.log(`Successfully created mod template in "${savePath}mods/${name}".`)
	}
	catch(e)
	{
		console.log(`Failed to create mod template: ${e}`)
		return
	}
}

async function listUploadedMods()
{
	console.log(`Listing authored mods...`)

	const accountID = SteamExtras.GetAccountID(ISteamUser.GetSteamID())
	const listType = EUserUGCList.k_EUserUGCList_Published
	const matchType = EUGCMatchingUGCType.k_EUGCMatchingUGCType_All
	const sortOrder = EUserUGCListSortOrder.k_EUserUGCListSortOrder_TitleAsc
	const creatorAppID = ISteamUtils.GetAppID()
	const consumerAppID = creatorAppID
	const page = 1
	const queryHandle = ISteamUGC.CreateQueryUserUGCRequest(accountID, listType, matchType, sortOrder, creatorAppID, consumerAppID, page )
	const query = await callback.steamAPI(ISteamUGC.SendQueryUGCRequest(queryHandle))
	var modData = []
	if (query.m_eResult == EResult.k_EResultOK) {
		// TODO pagination too large results for single query
		for( let i = 0; i < query.m_unNumResultsReturned; i++ ) {
			const result = ISteamUGC.GetQueryUGCResult(query.m_handle, i)
			if (!result.result)
				continue

			const item = {
				title: result.pDetails.m_rgchTitle,
				publishedFileId: result.pDetails.m_nPublishedFileId
			}
			modData.push(item)
		}
	}
	else {
		console.log(`Failed to list mods: ${query.m_eResult}`)
	}
	return modData
}

async function testListUploadedMods()
{
	const modData = await listUploadedMods()
	for(let i = 0; i < modData.length; i++) {
		const item = modData[i]
		console.log(`${i}: ${item.title} - ${item.publishedFileId}`)
	}
}

async function update(folder)
{
	const availableLocalMods = await listLocalMods()

	if (!availableLocalMods)
	{
		console.log("Mods folder not found.")
		return
	}

	for (let i = 0; i < availableLocalMods.length; i++) {
		if (availableLocalMods[i].folder == folder) {
			if (!availableLocalMods[i].isPublished) {
				console.log(`Mod "${folder}" is not published.`)
				break;
			}
			const appId = ISteamUtils.GetAppID()
			await updateMod(folder, appId, availableLocalMods[i].publishedFileId)
			break
		}
	}
}

async function updateMod(folder, appId, publishedFileId)
{
	await validateModContentFolder(InternalModPath + folder + "/content/")

	const updateModPath = getModPathForSteam(folder)

	// Load metadata file
	const metadataFile = updateModPath + "metadata.json"
	let fileExists = await File.exists(metadataFile);
	if (!fileExists) {
		console.log(`Metadata file "${metadataFile}" for mod "${folder}" not found.`);
		throw new Error(`Metadata file "${metadataFile}" for mod "${folder}" not found.`)
	}

	const metadata = await File.load(metadataFile)
	const data = JSON.parse(metadata)

	const updateHandle = ISteamUGC.StartItemUpdate(appId, publishedFileId)
	console.log(`updateHandle: ${updateHandle} with publishedFileId: ${publishedFileId}`)

	if (!ISteamUGC.SetItemUpdateLanguage(updateHandle, data.descriptionLanguage)) {
		console.log("Failed to set language")
		throw new Error("Failed to set language")
	}

	if ( data.title.length > Steam.k_cchPublishedDocumentTitleMax ) {
		console.log(`Title "${data.title}" for mod "${folder}" is too long. Maximum length is ${Steam.k_cchPublishedDocumentTitleMax} characters.`);
		throw new Error(`Title "${data.title}" for mod "${folder}" is too long. Maximum length is ${Steam.k_cchPublishedDocumentTitleMax} characters.`)
	}

	if (!ISteamUGC.SetItemTitle(updateHandle, data.title)) {
		console.log("Failed to set title")
		throw new Error("Failed to set title")
	}

	if ( data.description.length > Steam.k_cchPublishedDocumentDescriptionMax ) {
		console.log(`Description "${data.description}" for mod "${folder}" is too long. Maximum length is ${Steam.k_cchPublishedDocumentDescriptionMax} characters.`);
		throw new Error(`Description "${data.description}" for mod "${folder}" is too long. Maximum length is ${Steam.k_cchPublishedDocumentDescriptionMax} characters.`)
	}

	if (!ISteamUGC.SetItemDescription(updateHandle, data.description)) {
		console.log("Failed to set description")
		throw new Error("Failed to set description")
	}

	if (!ISteamUGC.SetItemPreview(updateHandle, updateModPath + "preview.png")) {
		console.log("Failed to set preview file")
		throw new Error("Failed to set preview file")
	}

	const visibility = data.visible ? ERemoteStoragePublishedFileVisibility.k_ERemoteStoragePublishedFileVisibilityPublic : ERemoteStoragePublishedFileVisibility.k_ERemoteStoragePublishedFileVisibilityPrivate
	if (!ISteamUGC.SetItemVisibility(updateHandle, visibility)) {
		console.log("Failed to set visibility")
		throw new Error("Failed to set visibility")
	}

	if (data.tags && data.tags.length > 0) {
		if (!ISteamUGC.SetItemTags(updateHandle, data.tags, false)) {
			console.log("Failed to set tags")
			throw new Error("Failed to set tags")
		}
	}

	// Write subset of metadata to content folder
	const internalContentFolder = InternalModPath + folder + "/content/"
	const contentModInfoFile = internalContentFolder + "modinfo.json"
	try {
		File.save(contentModInfoFile, JSON.stringify({title: data.title, baseLanguage: data.baseLanguage}))
		const steamContentFolder = updateModPath + "content/"
		if (!ISteamUGC.SetItemContent(updateHandle, steamContentFolder)) {
			console.log("Failed to set content")
			throw new Error("Failed to set content")
		}
	} catch (e) {
		console.log(`Failed to save content mod info: ${e}`)
		throw new Error(`Failed to save content mod info: ${e}`)
	}

	const submitResult = await callback.steamAPI(ISteamUGC.SubmitItemUpdate(updateHandle, "test1"))

	if ( submitResult.m_eResult != EResult.k_EResultOK )
	{
		console.log(`Failed to submit item: ${EResult[submitResult.m_eResult]}, needs to accept agreement: ${submitResult.m_bUserNeedsToAcceptWorkshopLegalAgreement}`)
		throw new Error(`Failed to submit item: ${EResult[submitResult.m_eResult]}, needs to accept agreement: ${submitResult.m_bUserNeedsToAcceptWorkshopLegalAgreement}`)
	}
	console.log(`Submitted item: ${submitResult.m_nPublishedFileId}`)
	return true
}

async function existsModTemplate(name)
{
	const path = getModPathForSteam(name)
	console.log(`path: ${path + "metadata.json"}`)
	return await File.exists(path + "metadata.json")
}

export async function uploadMod(folder)
{
	if(folder.endsWith("/")) {
		folder = folder.slice(0, -1)
	}
	const lastFolder = folder.split("/").pop()
	console.log(`lastFolder: ${lastFolder}`)
	if (!await existsModTemplate(lastFolder)) {
		console.log(`Mod template "${lastFolder}" does not exist.`)
		throw new Error(`Mod template "${lastFolder}" does not exist.`)
	}

	const publishedFileIdFile = InternalModPath + lastFolder + "/publishedFileId.json"
	const appId = ISteamUtils.GetAppID()
	let publishedFileId = ""
	if (await File.exists(publishedFileIdFile)) {
		const publishedFileIdContents = JSON.parse(await File.load(publishedFileIdFile))
		publishedFileId = publishedFileIdContents.publishedFileId
	}
	else {
		const createItem = await callback.steamAPI(ISteamUGC.CreateItem(appId, EWorkshopFileType.k_EWorkshopFileTypeCommunity))

		// check if success
		if ( createItem.m_eResult != EResult.k_EResultOK )
		{
			console.log(`Failed to create item: ${EResult[createItem.m_eResult]}`)
			throw new Error("Failed to create item")
		}

		publishedFileId = createItem.m_nPublishedFileId
	}

	const success = await updateMod(lastFolder, appId, publishedFileId)
	if (!success) {
		throw new Error("Failed to update mod")
	}
	// Save published ID to file
	File.save(publishedFileIdFile, JSON.stringify({publishedFileId: publishedFileId})).catch((e) => {
		console.log(`Failed to save: ${e}`)
	})
}

function stripFolders(path)
{
	return path.split("/").pop()
}

function containingFolder(path)
{
	return path.split("/").slice(0, -1).join("/")
}

export async function listLocalMods()
{
	if (!FS.directoryExists(InternalModPath))
		return []

	let availableLocalMods = []
	let modFolder = await Promise.resolve(new DirectoryStream(InternalModPath))
	let file = modFolder.next()
	while (!file.done)
	{
		if (file.value.isDirectory)
		{
			const metadataFile = file.value.fullPath + "/metadata.json"
			if (await File.exists(metadataFile)) {
				const contents = await File.load(metadataFile)
				const data = JSON.parse(contents)
				const localMod = {
					folder: file.value.fullPath,
					contentFolder: file.value.fullPath + "/content/",
					title: data.title,
					baseLanguage: data.baseLanguage,
					installed: true,
					id: await readOrGenerateRandomModId(file.value.fullPath)
				}

				const publishedFileIdFile = localMod.folder + "/publishedFileId.json"
				localMod.isPublished = await File.exists(publishedFileIdFile)
				let publishedFileId = ""
				if (localMod.isPublished) {
					const publishedFileIdContents = JSON.parse(await File.load(publishedFileIdFile))
					publishedFileId = publishedFileIdContents.publishedFileId
				}
				localMod.publishedFileId = publishedFileId

				availableLocalMods.push(localMod)
			}
			else if (await File.exists(file.value.fullPath + "/content/modinfo.json")) {
				const contents = await File.load(file.value.fullPath + "/content/modinfo.json")
				const data = JSON.parse(contents)
				const localMod = {
					folder: file.value.fullPath,
					contentFolder: file.value.fullPath + "/content/",
					title: data.title,
					baseLanguage: data.baseLanguage,
					installed: true,
					id: await readOrGenerateRandomModId(file.value.fullPath)
				}
				availableLocalMods.push(localMod)
			}
		}
		file = modFolder.next()
	}
	return availableLocalMods
}

async function localMods()
{
	const availableLocalMods = await listLocalMods()

	if (!availableLocalMods)
	{
		console.log("Mods folder not found.")
		return
	}

	for (let i = 0; i < availableLocalMods.length; i++) {
		console.log(`Mod "${availableLocalMods[i].id}" - "${availableLocalMods[i].folder}" - "${availableLocalMods[i].title}" - "${availableLocalMods[i].baseLanguage}" - "${availableLocalMods[i].publishedFileId}" - "${availableLocalMods[i].isPublished}"`)
	}
}

export async function listSubscribedItems()
{
	const count = ISteamUGC.GetNumSubscribedItems()
	const items = ISteamUGC.GetSubscribedItems(count)
	var subscribedItems = []
	for(const item of items.pvecPublishedFileID)
	{
		const installInfo = ISteamUGC.GetItemInstallInfo(item, 200)

		if (installInfo.result) {
			const contentModInfoFile = await File.load(installInfo.pchFolder + "/modinfo.json")
			const contentModInfo = JSON.parse(contentModInfoFile)
			subscribedItems.push({
				installed: true,
				contentFolder: installInfo.pchFolder,
				publishedFileId: item,
				id: item,
				...contentModInfo
			})
		}
		else {
			// TODO: Fetch mod info from workshop as we don't have the metadata file locally
			subscribedItems.push({
				installed: false,
				publishedFileId: item
			})
		}
	}
	subscribedItems.sort((a, b) => a.publishedFileId < b.publishedFileId)
	return subscribedItems
}

async function testListSubscribedItems()
{
	const subscribedItems = await listSubscribedItems()
	for(const item of subscribedItems) {
		console.log(`Subscribed item: "${item.title}" - "${item.contentFolder}" - "${item.publishedFileId}"`)
	}
}

async function testWorkshop(name)
{
	createModTemplate(name)
	uploadMod(name)
}


async function loadModLocalizationFiles(directoryPath, modId)
{
	if(!directoryPath) {
		console.log(`Error: mod load failed, directoryPath is not set for mod ${modId}`)
		return
	}
	// Look for baseLanguage.
	let baseLanguage
	if (await File.exists(directoryPath + "/modinfo.json"))
		baseLanguage = JSON.parse(await File.load(directoryPath + "/modinfo.json")).baseLanguage
	else
	{
		const modPath = directoryPath.replace("content", "/")
		if (await File.exists(modPath + "metadata.json"))
			baseLanguage = JSON.parse(await File.load(modPath + "metadata.json")).baseLanguage
		else
			console.log(`Error: ${modName} does not contain metadata.json or modinfo.json`)
	}

	const assignModFile = async (filePath, target, modName) => {
		const fileContent = await File.load(filePath)
		const modObject = JSON.parse(stripComments(fileContent))
		if (target == "wordlists") modObject.mod.baseLanguage = baseLanguage
		globalThis[target][modName] = modObject.mod
	}

	const modName = "mod_" + modId
	let modFolder = await DirectoryStream.fromURL(directoryPath)
	while(true) {
		let file = modFolder.next()
		if (file.done) break
		if (file.value.extension == ".wordlist") {
			await assignModFile(file.value.fullPath, "wordlists", modName)
		}
		else if (file.value.extension == ".triggers") {
			await assignModFile(file.value.fullPath, "triggerLetters", modName)
		}
		else if (file.value.extension == ".paragraphs") {
			await assignModFile(file.value.fullPath, "paragraphs", modName)
		}
	}
}

export async function reloadMods()
{
	const subscribedItems = await listSubscribedItems()
	const localMods = await listLocalMods()

	// Remove all keys starting with "mod_" from the global wordlists, trigger letters, and paragraphs
	for(const key in globalThis.wordlists) {
		if( key.startsWith("mod_") ) {
			delete globalThis.wordlists[key]
		}
	}
	for(const key in globalThis.triggerLetters) {
		if( key.startsWith("mod_") ) {
			delete globalThis.triggerLetters[key]
		}
	}
	for(const key in globalThis.paragraphs) {
		if( key.startsWith("mod_") ) {
			delete globalThis.paragraphs[key]
		}
	}

	// For each subscribed item and local mod, load the wordlists, trigger letters, and paragraphs, using the "mod_" + id as the key
	for(const item of subscribedItems) {
		// Check if mod is active before loading
		if (modOptions.getActive(item.id) && item.installed) {
			await loadModLocalizationFiles(item.contentFolder, item.id)
		}
		// else if (!item.installed) {
		// 	// TODO: Force mod download?
		// }
	}
	
	for(const mod of localMods) {
		// Check if mod is active before loading
		if (modOptions.getActive(mod.id)) {
			await loadModLocalizationFiles(mod.contentFolder, mod.id)
		}
	}

	const allMods = [...subscribedItems, ...localMods]
	modOptions.removeMissingMods(allMods)
}

class ModOptions
{
	constructor()
	{
		this.options = {
			mods: {}
		}
		this.optionsFilePath = InternalModPath + "modOptions.json"
	}

	async load()
	{
		try {
			if (await File.exists(this.optionsFilePath)) {
				const fileContents = await File.load(this.optionsFilePath)
				const loadedOptions = JSON.parse(fileContents)
				// Ensure structure is valid
				if (loadedOptions.mods && typeof loadedOptions.mods === "object") {
					this.options.mods = loadedOptions.mods
				}
			}
		} catch (e) {
			console.log(`Failed to load mod options: ${e}`)
			// Keep default empty structure on error
		}
	}

	getActive(modIdentifier)
	{
		if (this.options.mods[modIdentifier] && "active" in this.options.mods[modIdentifier]) {
			return this.options.mods[modIdentifier].active
		}
		// Default to true if mod not found in options
		return true
	}

	setActive(modIdentifier, active)
	{
		if (!this.options.mods[modIdentifier]) {
			this.options.mods[modIdentifier] = {}
		}
		this.options.mods[modIdentifier].active = active
		if (globalThis.currentGameLanguage === "mod_" + modIdentifier) {
			changeGameLanguage("english")
		}
	}

	async save()
	{
		try {
			// Ensure mods directory exists
			if (!FS.directoryExists(InternalModPath)) {
				FS.createDirectory(InternalModPath)
			}
			// Save to file
			await File.save(this.optionsFilePath, JSON.stringify(this.options, null, 2))
		} catch (e) {
			console.log(`Failed to save mod options: ${e}`)
			// throw e
		}
	}

	removeMissingMods(listOfMods)
	{
		for(const mod of Object.keys(this.options.mods)) {
			if (!listOfMods.some(m => m.id === mod)) {
				delete this.options.mods[mod]
			}
		}
		this.save()
	}
}

export const modOptions = new ModOptions()

export async function itemInstalled(item)
{
	const installInfo = ISteamUGC.GetItemInstallInfo(item.m_nPublishedFileId, 200)
	if (installInfo.result) {
		await loadModLocalizationFiles(installInfo.pchFolder, item.m_nPublishedFileId)
		globalThis.ui.steamWorkshop.panel.refresh()
	}
}