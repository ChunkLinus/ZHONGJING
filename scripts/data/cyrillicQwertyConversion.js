import { Random } from "sphere-runtime"

const cyrillicQwertyConversion = {
    "q": ["й", "й", ","],
    "w": ["ц", "ц", "у"],
    "e": ["у", "у", "е"],
    "r": ["к", "к", "и"],
    "t": ["е", "е", "ш"],
    "y": ["н", "н", "щ"],
    "u": ["г", "г", "к"],
    "i": ["ш", "ш", "с"],
    "o": ["щ", "щ", "д"],
    "p": ["з", "з", "з"],
    "[": ["х", "х", "ц"],
    "]": ["ъ", "ї", ";"],
    "a": ["ф", "ф", "ь"],
    "s": ["ы", "і", "я"],
    "d": ["в", "в", "а"],
    "f": ["а", "а", "о"],
    "g": ["п", "п", "ж"],
    "h": ["р", "р", "г"],
    "j": ["о", "о", "т"],
    "k": ["л", "л", "н"],
    "l": ["д", "д", "в"],
    ";": ["ж", "ж", "м"],
    "'": ["э", "є", "ч"],
    "z": ["я", "я", "ю"],
    "x": ["ч", "ч", "й"],
    "c": ["с", "с", "ъ"],
    "v": ["м", "м", "э"],
    "b": ["и", "и", "ф"],
    "n": ["т", "т", "х"],
    "m": ["ь", "ь", "п"],
    ",": ["б", "б", "р"],
    ".": ["ю", "ю", "л"],
    "/": [".", ".", "б"],
    "\\": ["\\", "ґ", "ѝ"],
    "`": ["ё", "'", "("],
    "=": ["=", "=", "."],
    "~": ["Ё", "₴", ")"],
    "@": ['"', '"', "?"],
    "#": ["№", "№", "+"],
    "$": [";", ";", '"'],
    "^": [":", ":", "="],
    "&": ["?", "?", ":"],
    "*": ["*", "*", "/"],
    "(": ["(", "(", "–"],
    ")": [")", ")", "№"],
    "_": ["_", "_", "$"],
    "+": ["+", "+", "€"],
    "Q": ["Й", "Й", "ы"],
    "W": ["Ц", "Ц", "У"],
    "E": ["У", "У", "Е"],
    "R": ["К", "К", "И"],
    "T": ["Е", "Е", "Ш"],
    "Y": ["Н", "Н", "Щ"],
    "U": ["Г", "Г", "К"],
    "I": ["Ш", "Ш", "С"],
    "O": ["Щ", "Щ", "Д"],
    "P": ["З", "З", "З"],
    "{": ["Х", "Х", "Ц"],
    "}": ["Ъ", "Ї", "§"],
    "A": ["Ф", "Ф", "ѝ"],
    "S": ["Ы", "І", "Я"],
    "D": ["В", "В", "А"],
    "F": ["А", "А", "О"],
    "G": ["П", "П", "Ж"],
    "H": ["Р", "Р", "Г"],
    "J": ["О", "О", "Т"],
    "K": ["Л", "Л", "Н"],
    "L": ["Д", "Д", "В"],
    ":": ["Ж", "Ж", "М"],
    '"': ["Э", "Є", "Ч"],
    "Z": ["Я", "Я", "Ю"],
    "X": ["Ч", "Ч", "Й"],
    "C": ["С", "С", "Ъ"],
    "V": ["М", "М", "Э"],
    "B": ["И", "И", "Ф"],
    "N": ["Т", "Т", "Х"],
    "M": ["Ь", "Ь", "П"],
    "<": ["Б", "Б", "Р"],
    ">": ["Ю", "Ю", "Л"],
    "?": [",", ",", "Б"],
    "|": ["/", "Ґ", "Ѝ"]
}
const cyrillicLanguages = ["russian", "ukrainian", "bulgarian"]
const cyrillicEntries = Object.entries(cyrillicQwertyConversion)
const ukrainianUniqueChar = ["ґ", "є", "і", "ї"]
const russianUniqueChar = ["ё", "ы", "э"]
export const convertCyrillic = function(char)
{
    let index = cyrillicLanguages.indexOf(currentGameLanguage)
    if (index >= 0 && char in cyrillicQwertyConversion)
        return cyrillicQwertyConversion[char][index]
    return char
}
export const getRandomChar = function()
{
    let letter = Random.sample("abcdefghijklmnopqrstuvwxyz")
    let index = cyrillicLanguages.indexOf(currentGameLanguage)
    return index >= 0 ? cyrillicQwertyConversion[letter][index] : letter
}
export const getKeyCode = function(char)
{
    let index = cyrillicLanguages.indexOf(currentGameLanguage)
    return Key[ index >= 0 ? cyrillicEntries.find(entry => entry[1][index] == char)[0].toUpperCase() : char.toUpperCase()]
}
export const isUkrainian = function(text)
{
    return ukrainianUniqueChar.some(char => text.includes(char))
}
export const isRussian = function(text)
{
    return russianUniqueChar.some(char => text.includes(char))
}