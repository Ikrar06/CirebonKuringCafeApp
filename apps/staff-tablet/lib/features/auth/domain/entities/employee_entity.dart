import 'package:equatable/equatable.dart';

class EmployeeEntity extends Equatable {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final bool isActive;
  final String? photoUrl;

  const EmployeeEntity({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.isActive,
    this.photoUrl,
  });

  @override
  List<Object?> get props => [id, name, email, phone, role, isActive, photoUrl];
}
