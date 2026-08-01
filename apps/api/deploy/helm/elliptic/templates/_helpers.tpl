{{- define "elliptic.name" -}}
{{- default "elliptic" .Values.nameOverride -}}
{{- end -}}

{{- define "elliptic.databaseUrl" -}}
{{- if .Values.externalDatabaseUrl -}}
{{- .Values.externalDatabaseUrl -}}
{{- else -}}
postgresql+asyncpg://companyos:companyos@{{ include "elliptic.name" . }}-postgres:5432/companyos
{{- end -}}
{{- end -}}
