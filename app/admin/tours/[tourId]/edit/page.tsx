"use client";
import {useParams} from "next/navigation";
import TourEditor from "@/components/TourEditor";
export default function EditTourPage(){const params=useParams();return <TourEditor tourId={String(params.tourId)}/>;}
