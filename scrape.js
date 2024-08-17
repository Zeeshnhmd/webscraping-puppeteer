import puppeteer from 'puppeteer';
import fs from 'fs';
import ora from 'ora';

const scrape = async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	const allBooks = [];
	let currentPage = 1;
	const maxPages = 50;

	// Initialize ora spinner
	const spinner = ora('Starting scraping process...').start();

	while (currentPage <= maxPages) {
		const url = `https://books.toscrape.com/catalogue/page-${currentPage}.html`;

		// Update spinner text for page scraping
		spinner.text = `Scraping page ${currentPage} of ${maxPages}`;

		await page.goto(url);

		const bookLinks = await page.evaluate(() => {
			const bookElements = document.querySelectorAll('.product_pod');
			return Array.from(bookElements).map((book) => {
				const link =
					'https://books.toscrape.com/catalogue/' +
					book.querySelector('h3 a').getAttribute('href');
				return { link };
			});
		});

		for (const [index, bookLink] of bookLinks.entries()) {
			const { link } = bookLink;

			// Update spinner text for each book
			spinner.text = `Scraping book ${index + 1} of ${
				bookLinks.length
			} on page ${currentPage}`;

			await page.goto(link);

			const bookDetails = await page.evaluate(() => {
				const title = document
					.querySelector('.item.active img')
					.getAttribute('alt');
				const image = document
					.querySelector('.item.active img')
					.getAttribute('src')
					.replace('../../', 'https://books.toscrape.com/');
				const price = document.querySelector(
					'.product_main .price_color'
				).textContent;
				const stock = document.querySelector(
					'.product_main .instock.availability'
				)
					? 'In Stock'
					: 'Out of Stock';
				const rating = document
					.querySelector('.product_main .star-rating')
					.className.split(' ')[1];
				const description =
					document
						.querySelector('#product_description')
						?.nextElementSibling.textContent.replace(' ...more', '') || '';

				const rows = document.querySelectorAll('.table-striped tbody tr');
				const data = {};
				rows.forEach((row) => {
					const header = row.querySelector('th').textContent.trim() || '';
					const value = row.querySelector('td').textContent.trim() || '';
					if (header && value) {
						data[header] = value;
					}
				});

				return {
					title,
					image,
					price,
					stock,
					rating,
					description,
					productInfo: data,
				};
			});

			allBooks.push({ link, ...bookDetails });
		}

		currentPage++;
	}

	// Final success message
	spinner.succeed('Scraping complete.');

	fs.writeFileSync('books.json', JSON.stringify(allBooks, null, 2));

	console.log('Data saved to books.json');

	await browser.close();
};

scrape();
