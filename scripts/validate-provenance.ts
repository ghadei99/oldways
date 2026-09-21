import { PrismaClient } from "@prisma/client";
import { validateProductionProvenance } from "../src/lib/content/provenance";
import {
  isCommercialBuild,
  preferredSanskritSourceSlug,
  sanskritSourceAllowedInCurrentMode,
  VISIBILITY,
} from "../src/lib/content/visibility";

async function main() {
  const prisma = new PrismaClient();
  try {
    const preferredSlug = preferredSanskritSourceSlug();
    const preferred = await prisma.source.findUnique({
      where: { slug: preferredSlug },
    });
    const passages = await prisma.passage.findMany({
      include: { textSource: true },
    });
    const translations = await prisma.translation.findMany({
      include: { source: true },
    });
    const commercial = isCommercialBuild();

    const issues = validateProductionProvenance({
      commercialBuild: commercial,
      preferredSource: {
        slug: preferredSlug,
        exists: Boolean(preferred),
        visibility: preferred?.visibility,
        licence: preferred?.licence,
        copyrightStatus: preferred?.copyrightStatus,
        commercialUseAllowed: preferred?.commercialUseAllowed,
      },
      passages: passages.map((p) => {
        const displayed = p.textSource
          ? sanskritSourceAllowedInCurrentMode(p.textSource)
          : false;
        return {
          id: p.id,
          canonicalReference: p.canonicalReference,
          originalText: p.originalText,
          displayed,
          textSource: p.textSource
            ? {
                slug: p.textSource.slug,
                licence: p.textSource.licence,
                copyrightStatus: p.textSource.copyrightStatus,
                visibility: p.textSource.visibility,
                commercialUseAllowed: p.textSource.commercialUseAllowed,
              }
            : null,
        };
      }),
      translations: translations.map((t) => ({
        id: t.id,
        language: t.language,
        visibility: t.visibility,
        status: t.status,
        isDemo: t.isDemo,
        translatorId: t.translatorId,
        sourceId: t.sourceId,
        historicalWorkId: t.historicalWorkId,
        copyrightStatus: t.copyrightStatus,
        source: t.source
          ? { licence: t.source.licence, copyrightStatus: t.source.copyrightStatus }
          : null,
      })),
    });

    const developmentOnly = translations.filter(
      (t) => t.visibility === VISIBILITY.DEVELOPMENT || t.isDemo,
    );

    if (issues.length) {
      console.error(`Provenance validation failed (${issues.length} issues).`);
      for (const issue of issues.slice(0, 30)) {
        console.error(
          `${issue.kind} ${issue.reference ?? issue.id}: ${issue.message}`,
        );
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Provenance OK. Commercial build: ${commercial}. Preferred Sanskrit: ${preferredSlug}. Passages ${passages.length}. Production translations ${translations.filter((t) => t.visibility === VISIBILITY.PRODUCTION && !t.isDemo).length}. Development translations ${developmentOnly.length}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
