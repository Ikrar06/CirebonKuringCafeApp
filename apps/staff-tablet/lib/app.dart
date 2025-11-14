import 'package:flutter/material.dart';

import 'config/theme.dart';
import 'config/routes.dart';

class StaffTabletApp extends StatelessWidget {
  const StaffTabletApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cirebon Kuring Staff Tablet',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: AppRoutes.initial,
      onGenerateRoute: AppRoutes.onGenerateRoute,
    );
  }
}
