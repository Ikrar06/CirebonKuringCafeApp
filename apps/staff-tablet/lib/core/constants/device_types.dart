enum DeviceType {
  dapur,
  kasir,
  pelayan,
  stok;

  String get displayName {
    switch (this) {
      case DeviceType.dapur:
        return 'Dapur (Kitchen)';
      case DeviceType.kasir:
        return 'Kasir (Cashier)';
      case DeviceType.pelayan:
        return 'Pelayan (Waiter)';
      case DeviceType.stok:
        return 'Stok (Inventory)';
    }
  }

  String get routeName {
    switch (this) {
      case DeviceType.dapur:
        return '/dapur';
      case DeviceType.kasir:
        return '/kasir';
      case DeviceType.pelayan:
        return '/pelayan';
      case DeviceType.stok:
        return '/stok';
    }
  }

  static DeviceType? fromString(String? value) {
    if (value == null) return null;
    switch (value) {
      case 'dapur':
        return DeviceType.dapur;
      case 'kasir':
        return DeviceType.kasir;
      case 'pelayan':
        return DeviceType.pelayan;
      case 'stok':
        return DeviceType.stok;
      default:
        return null;
    }
  }
}
