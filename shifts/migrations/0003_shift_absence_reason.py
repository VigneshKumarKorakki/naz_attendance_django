from django.db import migrations, models


def migrate_absence_reasons(apps, schema_editor):
    Shift = apps.get_model("shifts", "Shift")
    ShiftAudit = apps.get_model("shifts", "ShiftAudit")
    reason_statuses = {"sick", "site_out", "no_work", "safety", "training"}

    for model in (Shift, ShiftAudit):
        (
            model.objects.filter(status__in=reason_statuses)
            .exclude(status__isnull=True)
            .update(status="absent", absence_reason=models.F("status"))
        )


class Migration(migrations.Migration):
    dependencies = [
        ("shifts", "0002_shift_hours_shiftaudit_hours"),
    ]

    operations = [
        migrations.AddField(
            model_name="shift",
            name="absence_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("sick", "Sick"),
                    ("site_out", "Site Out"),
                    ("no_work", "No Work"),
                    ("safety", "Safety"),
                    ("training", "Training"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="shiftaudit",
            name="absence_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("sick", "Sick"),
                    ("site_out", "Site Out"),
                    ("no_work", "No Work"),
                    ("safety", "Safety"),
                    ("training", "Training"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="shift",
            name="status",
            field=models.CharField(
                choices=[("present", "Present"), ("absent", "Absent")],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="shiftaudit",
            name="status",
            field=models.CharField(
                choices=[("present", "Present"), ("absent", "Absent")],
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_absence_reasons, migrations.RunPython.noop),
    ]
