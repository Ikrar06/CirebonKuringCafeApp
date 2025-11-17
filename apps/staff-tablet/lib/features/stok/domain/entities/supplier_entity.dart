import 'package:equatable/equatable.dart';

/// Supplier entity for inventory suppliers
class SupplierEntity extends Equatable {
  final String id;
  final String code;
  final String name;
  final String? contactPerson;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final String? postalCode;
  final String? notes;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SupplierEntity({
    required this.id,
    required this.code,
    required this.name,
    this.contactPerson,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.postalCode,
    this.notes,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Get supplier display name with code
  String get displayName => '[$code] $name';

  /// Get full address
  String get fullAddress {
    final parts = <String>[];
    if (address != null && address!.isNotEmpty) parts.add(address!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    if (postalCode != null && postalCode!.isNotEmpty) parts.add(postalCode!);
    return parts.join(', ');
  }

  @override
  List<Object?> get props => [
        id,
        code,
        name,
        contactPerson,
        phone,
        email,
        address,
        city,
        postalCode,
        notes,
        isActive,
        createdAt,
        updatedAt,
      ];
}
