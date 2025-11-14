import 'package:equatable/equatable.dart';

class MenuItemEntity extends Equatable {
  final String id;
  final String? categoryId; // UUID reference to menu_categories
  final String name;
  final String slug;
  final String? description;
  final double basePrice;
  final String? imageUrl;
  final String? thumbnailUrl;
  final bool isAvailable;
  final int estimatedPrepTime; // in minutes

  const MenuItemEntity({
    required this.id,
    this.categoryId,
    required this.name,
    required this.slug,
    this.description,
    required this.basePrice,
    this.imageUrl,
    this.thumbnailUrl,
    required this.isAvailable,
    required this.estimatedPrepTime,
  });

  @override
  List<Object?> get props => [
        id,
        categoryId,
        name,
        slug,
        description,
        basePrice,
        imageUrl,
        thumbnailUrl,
        isAvailable,
        estimatedPrepTime,
      ];
}
