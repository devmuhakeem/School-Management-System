import { prisma } from "@/lib/db";
import { Organization, Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";

export class OrganizationRepository {
  /**
   * Find organization by unique ID
   */
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        campuses: true,
      },
    });
  }

  /**
   * Find organization by unique slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        campuses: {
          where: { status: "ACTIVE" },
        },
      },
    });
  }

  /**
   * Create new organization with default campus
   */
  async create(
    data: Prisma.OrganizationCreateInput,
    defaultCampusName: string = "Main Campus",
    defaultCampusCode: string = "MAIN"
  ): Promise<Organization> {
    return prisma.organization.create({
      data: {
        ...data,
        campuses: {
          create: {
            name: defaultCampusName,
            code: defaultCampusCode,
          },
        },
      },
      include: {
        campuses: true,
      },
    });
  }

  /**
   * Update organization profile
   */
  async update(id: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Organization", id);
    }
    return prisma.organization.update({
      where: { id },
      data,
    });
  }
}

export const organizationRepository = new OrganizationRepository();
