import Image from "next/image";
import { Car } from "lucide-react";
import { TypeBadge } from "./TypeBadge";
import { VehicleKebabMenu } from "./VehicleKebabMenu";
import type { Vehicle } from "@/types";

interface Props {
  vehicle: Vehicle;
  currentUserId: string;
}

export function VehicleHeader({ vehicle, currentUserId }: Props) {
  return (
    <div className="relative h-[200px] bg-gray-200 overflow-hidden">
      {vehicle.imageUrl ? (
        <Image
          src={vehicle.imageUrl}
          alt={vehicle.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Car size={64} className="text-gray-400" aria-hidden="true" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Vehicle info overlay */}
      <div className="absolute bottom-3 left-4 right-12 text-white">
        <h1 className="text-xl font-bold leading-tight">{vehicle.name}</h1>
        <p className="text-sm opacity-90 mt-0.5">{vehicle.registrationNumber}</p>
        <TypeBadge type={vehicle.type} className="mt-1" />
      </div>

      {/* Kebab menu */}
      <div className="absolute top-3 right-3">
        <VehicleKebabMenu
          vehicleId={vehicle.id}
          isOwner={vehicle.userId === currentUserId}
        />
      </div>
    </div>
  );
}
