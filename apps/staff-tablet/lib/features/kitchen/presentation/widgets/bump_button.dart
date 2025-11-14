import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';

class BumpButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool isLarge;

  const BumpButton({
    super.key,
    required this.onPressed,
    this.isLarge = false,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.colorSuccess,
        foregroundColor: AppColors.colorWhite,
        padding: EdgeInsets.symmetric(
          horizontal: isLarge ? 32 : 24,
          vertical: isLarge ? 20 : 16,
        ),
        minimumSize: Size(isLarge ? 160 : 120, isLarge ? 64 : 56),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 2,
      ),
      icon: Icon(
        Icons.check_circle_outline,
        size: isLarge ? 28 : 24,
      ),
      label: Text(
        'BUMP',
        style: TextStyle(
          fontSize: isLarge ? 20 : 18,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
