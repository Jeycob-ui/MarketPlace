module.exports = (sequelize, DataTypes) => {
  return sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }
  });
};
