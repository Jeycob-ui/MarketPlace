
const bcrypt = require('bcryptjs');
const { sequelize, User, Product, Order, OrderItem } = require('../models');

async function importData({ force = false } = {}) {
	try {
		await sequelize.sync({ force });

		console.log('Creando usuarios...');
		const [admin] = await User.findOrCreate({
			where: { email: 'admin@example.com' },
			defaults: {
				name: 'Admin',
				passwordHash: bcrypt.hashSync('adminpass', 8),
				role: 'admin',
			},
		});

		const [vendor] = await User.findOrCreate({
			where: { email: 'vendor@example.com' },
			defaults: {
				name: 'Vendor One',
				passwordHash: bcrypt.hashSync('vendorpass', 8),
				role: 'vendor',
			},
		});

		const [buyer] = await User.findOrCreate({
			where: { email: 'buyer@example.com' },
			defaults: {
				name: 'Buyer One',
				passwordHash: bcrypt.hashSync('buyerpass', 8),
				role: 'buyer',
			},
		});

		console.log('Creando productos...');
		const productDefs = [
			{ title: 'Camiseta', description: 'Camiseta 100% algodón', price: 19.99, quantity: 50, image: '', userId: vendor.id },
			{ title: 'Pantalón', description: 'Pantalón cómodo', price: 39.99, quantity: 30, image: '', userId: vendor.id },
			{ title: 'Gorra', description: 'Gorra clásica', price: 9.99, quantity: 100, image: '', userId: vendor.id },
		];

		const products = [];
		for (const def of productDefs) {
			const [p] = await Product.findOrCreate({ where: { title: def.title, userId: def.userId }, defaults: def });
			products.push(p);
		}

		console.log('Creando orden de ejemplo...');
		const order = await Order.create({ userId: buyer.id, status: 'paid', total: 0 });

		let total = 0;
		for (const p of products.slice(0, 2)) {
			const quantity = 2;
			const price = p.price;
			await OrderItem.create({ orderId: order.id, productId: p.id, quantity, price });
			total += price * quantity;
		}

		order.total = total;
		await order.save();

		console.log('Seed importado correctamente.');
		process.exit();
	} catch (err) {
		console.error('Error importando seed:', err);
		process.exit(1);
	}
}

async function deleteData() {
	try {
		// Eliminamos en orden para evitar problemas con claves foráneas
		await OrderItem.destroy({ where: {}, truncate: true });
		await Order.destroy({ where: {}, truncate: true });
		await Product.destroy({ where: {}, truncate: true });
		await User.destroy({ where: {}, truncate: true });

		console.log('Datos eliminados correctamente.');
		process.exit();
	} catch (err) {
		console.error('Error eliminando datos:', err);
		process.exit(1);
	}
}

function printUsage() {
	console.log('Uso: node seeders/seed.js --import [--force]   -> Importa datos de ejemplo (opcional --force para recrear tablas)');
	console.log('     node seeders/seed.js --delete               -> Elimina todos los datos de las tablas');
}

const args = process.argv.slice(2);
if (args.includes('--import') || args.includes('--seed')) {
	const force = args.includes('--force');
	importData({ force });
} else if (args.includes('--delete') || args.includes('--destroy')) {
	deleteData();
} else {
	printUsage();
	process.exit();
}

