import '../../domain/entities/menu_item_entity.dart';

class MenuItemModel extends MenuItemEntity {
  const MenuItemModel({
    required super.id,
    super.categoryId,
    required super.name,
    required super.slug,
    super.description,
    required super.basePrice,
    super.imageUrl,
    super.thumbnailUrl,
    required super.isAvailable,
    required super.estimatedPrepTime,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    return MenuItemModel(
      id: json['id'] as String,
      categoryId: json['category_id'] as String?,
      name: json['name'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String?,
      basePrice: (json['base_price'] as num).toDouble(),
      imageUrl: json['image_url'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      isAvailable: json['is_available'] as bool? ?? true,
      estimatedPrepTime: json['estimated_prep_time'] as int? ?? 15,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (categoryId != null) 'category_id': categoryId,
      'name': name,
      'slug': slug,
      if (description != null) 'description': description,
      'base_price': basePrice,
      if (imageUrl != null) 'image_url': imageUrl,
      if (thumbnailUrl != null) 'thumbnail_url': thumbnailUrl,
      'is_available': isAvailable,
      'estimated_prep_time': estimatedPrepTime,
    };
  }

  factory MenuItemModel.fromEntity(MenuItemEntity entity) {
    return MenuItemModel(
      id: entity.id,
      categoryId: entity.categoryId,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      basePrice: entity.basePrice,
      imageUrl: entity.imageUrl,
      thumbnailUrl: entity.thumbnailUrl,
      isAvailable: entity.isAvailable,
      estimatedPrepTime: entity.estimatedPrepTime,
    );
  }

  MenuItemEntity toEntity() {
    return MenuItemEntity(
      id: id,
      categoryId: categoryId,
      name: name,
      slug: slug,
      description: description,
      basePrice: basePrice,
      imageUrl: imageUrl,
      thumbnailUrl: thumbnailUrl,
      isAvailable: isAvailable,
      estimatedPrepTime: estimatedPrepTime,
    );
  }
}
