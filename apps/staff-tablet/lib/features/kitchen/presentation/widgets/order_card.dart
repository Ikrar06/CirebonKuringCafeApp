import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../domain/entities/order_entity.dart';
import 'bump_button.dart';
import 'timer_widget.dart';

class OrderCard extends StatelessWidget {
  final OrderEntity order;
  final VoidCallback? onStart;
  final VoidCallback? onReady;
  final VoidCallback? onBump;

  const OrderCard({
    super.key,
    required this.order,
    this.onStart,
    this.onReady,
    this.onBump,
  });

  Color _getStatusColor() {
    switch (order.status) {
      case 'confirmed':
        return AppColors.colorInfo;
      case 'preparing':
        return AppColors.colorWarning;
      case 'ready':
        return AppColors.colorSuccess;
      default:
        return AppColors.colorGray600;
    }
  }

  String _getStatusLabel() {
    switch (order.status) {
      case 'confirmed':
        return 'NEW ORDER';
      case 'preparing':
        return 'PREPARING';
      case 'ready':
        return 'READY';
      default:
        return order.status.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();

    return Container(
      width: 380,
      margin: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppColors.colorWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: statusColor,
          width: 3,
        ),
        boxShadow: [
          BoxShadow(
            color: statusColor.withValues(alpha: 0.2),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(13),
                topRight: Radius.circular(13),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Order #${order.orderNumber}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.colorWhite,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Table ${order.tableNumber}',
                      style: const TextStyle(
                        fontSize: 16,
                        color: AppColors.colorWhite,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.colorWhite,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _getStatusLabel(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Timer
          if (order.status != 'confirmed')
            Padding(
              padding: const EdgeInsets.all(16),
              child: TimerWidget(
                startTime: order.preparingAt ?? order.createdAt,
                estimatedMinutes: order.estimatedPrepTime,
                isOverdue: order.isOverdue,
              ),
            ),

          // Items
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: order.items.length,
              separatorBuilder: (_, __) => const Divider(height: 16),
              itemBuilder: (context, index) {
                final item = order.items[index];
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlue,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          '${item.quantity}x',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.colorWhite,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.menuItem.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (item.notes != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              item.notes!,
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.colorGray600,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppColors.colorGray50,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(13),
                bottomRight: Radius.circular(13),
              ),
            ),
            child: _buildActions(),
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    if (order.status == 'confirmed' && onStart != null) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: onStart,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.colorInfo,
            foregroundColor: AppColors.colorWhite,
            padding: const EdgeInsets.symmetric(vertical: 16),
            minimumSize: const Size.fromHeight(56),
          ),
          icon: const Icon(Icons.play_arrow, size: 24),
          label: const Text(
            'START PREPARING',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    if (order.status == 'preparing' && onReady != null) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: onReady,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.colorWarning,
            foregroundColor: AppColors.colorWhite,
            padding: const EdgeInsets.symmetric(vertical: 16),
            minimumSize: const Size.fromHeight(56),
          ),
          icon: const Icon(Icons.done, size: 24),
          label: const Text(
            'MARK AS READY',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    if (order.status == 'ready' && onBump != null) {
      return BumpButton(
        onPressed: onBump!,
        isLarge: true,
      );
    }

    return const SizedBox.shrink();
  }
}
