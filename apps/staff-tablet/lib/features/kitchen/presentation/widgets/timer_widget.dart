import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';

class TimerWidget extends StatefulWidget {
  final DateTime startTime;
  final int estimatedMinutes;
  final bool isOverdue;

  const TimerWidget({
    super.key,
    required this.startTime,
    required this.estimatedMinutes,
    this.isOverdue = false,
  });

  @override
  State<TimerWidget> createState() => _TimerWidgetState();
}

class _TimerWidgetState extends State<TimerWidget> {
  late Timer _timer;
  late Duration _elapsed;

  @override
  void initState() {
    super.initState();
    _updateElapsed();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _updateElapsed();
        });
      }
    });
  }

  void _updateElapsed() {
    _elapsed = DateTime.now().difference(widget.startTime);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Color _getTimerColor() {
    final elapsedMinutes = _elapsed.inMinutes;

    if (elapsedMinutes >= widget.estimatedMinutes) {
      return AppColors.colorError; // Overdue
    } else if (elapsedMinutes >= widget.estimatedMinutes * 0.75) {
      return AppColors.colorWarning; // Warning (75% of estimated time)
    } else {
      return AppColors.colorSuccess; // On track
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getTimerColor();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color, width: 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.timer_outlined,
            size: 20,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            _formatDuration(_elapsed),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '/ ${widget.estimatedMinutes}m',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.colorGray600,
            ),
          ),
        ],
      ),
    );
  }
}
