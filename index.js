const fs = require('fs');
const cheerio = require('cheerio');
const css = require('css');

const html = fs.readFileSync('input.html', 'utf8');
const cssContent = fs.readFileSync('style.css', 'utf8')

function findProperties() {
    let result = {};
    let size = 4;
    let count = 0;
    let ths = table.querySelectorAll('th');

    let index = '';
    table.querySelectorAll('td').forEach(td => {
        let thindex = count % size;
        if(thindex == 0) {
            let a = td.querySelector('a');
            index = td.innerText;
            if(!result[index]) result[index] = {};
            if(a.href.split("mozilla").length > 1) result[index]['native'] = true;
            else result[index]['native'] = false;
        }
        else {
            let th = ths[thindex].innerText.toLowerCase();
            result[index][th] = td.innerText;
        }
        count++;
    });

    table.innerText = JSON.stringify(result, null, 4);
}