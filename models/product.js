module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    image: { type: DataTypes.TEXT('long') },
    imageMimeType: { type: DataTypes.STRING, defaultValue: 'image/jpeg' }
    ,
    // Estado del producto: activo (visible en tienda) o inactivo
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  });
};
